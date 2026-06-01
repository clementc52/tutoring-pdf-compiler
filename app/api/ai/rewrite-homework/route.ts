import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function detectSection(request: string) {
  const lower = request.toLowerCase();

  if (lower.includes("section a")) return "Section A";
  if (lower.includes("section b")) return "Section B";
  if (lower.includes("section c")) return "Section C";
  if (lower.includes("section d")) return "Section D";
  if (lower.includes("section e")) return "Section E";
  if (lower.includes("section f")) return "Section F";

  return null;
}

function extractSection(latex: string, sectionName: string) {
  const sectionStart = latex.indexOf(`\\section{${sectionName}`);
  const altSectionStart = latex.indexOf(`\\section*{${sectionName}`);

  const start =
    sectionStart >= 0
      ? sectionStart
      : altSectionStart >= 0
        ? altSectionStart
        : -1;

  if (start === -1) return null;

  const nextSection = latex.indexOf("\\section", start + 1);
  const endDocument = latex.indexOf("\\end{document}", start);

  const end =
    nextSection >= 0
      ? nextSection
      : endDocument >= 0
        ? endDocument
        : latex.length;

  return {
    start,
    end,
    content: latex.slice(start, end),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const draftId = body.draftId;

    if (!draftId) {
      return NextResponse.json(
        { error: "Missing draftId." },
        { status: 400 }
      );
    }

    const { data: draft, error } = await supabaseAdmin
      .from("homework_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!draft) {
      return NextResponse.json(
        { error: "Draft not found." },
        { status: 404 }
      );
    }

    const currentLatex = draft.latex_source ?? "";
    const revisionRequest = draft.revision_request ?? "";

    if (!revisionRequest.trim()) {
      return NextResponse.json(
        { error: "No revision request found." },
        { status: 400 }
      );
    }

    const targetSection = detectSection(revisionRequest);
    const extracted =
      targetSection && extractSection(currentLatex, targetSection);

    if (!targetSection || !extracted) {
      const response = await openai.responses.create({
        model: "gpt-5.4-mini",
        input: [
          {
            role: "system",
            content:
              "You are an expert LaTeX worksheet editor. Return ONLY complete compilable LaTeX source. Do not use markdown. Preserve the existing worksheet template and style exactly.",
          },
          {
            role: "user",
            content: `Current LaTeX document:

${currentLatex}

Revision request:
${revisionRequest}

Rewrite the full LaTeX document according to the request.`,
          },
        ],
      });

      const revisedLatex = response.output_text;

      if (!revisedLatex || !revisedLatex.includes("\\documentclass")) {
        return NextResponse.json(
          { error: "AI did not return valid LaTeX." },
          { status: 500 }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("homework_drafts")
        .update({
          latex_source: revisedLatex,
          status: "revised",
        })
        .eq("id", draft.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "AI revision completed using full-document mode.",
      });
    }

    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content:
            "You are an expert LaTeX worksheet editor. Return ONLY the revised LaTeX section. Do not use markdown. Do not include explanations. Preserve the existing worksheet style. The returned text must begin with the same \\section command.",
        },
        {
          role: "user",
          content: `Current section:

${extracted.content}

Revision request:
${revisionRequest}

Rewrite only this section according to the request. Return only the revised section.`,
        },
      ],
    });

    const revisedSection = response.output_text;

    if (!revisedSection || !revisedSection.includes("\\section")) {
      return NextResponse.json(
        { error: "AI did not return a valid revised section." },
        { status: 500 }
      );
    }

    const revisedLatex =
      currentLatex.slice(0, extracted.start) +
      revisedSection.trim() +
      "\n\n" +
      currentLatex.slice(extracted.end);

    const { error: updateError } = await supabaseAdmin
      .from("homework_drafts")
      .update({
        latex_source: revisedLatex,
        status: "revised",
      })
      .eq("id", draft.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `AI revision completed using ${targetSection} patch mode.`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}