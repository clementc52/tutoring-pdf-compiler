import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const submissionId = body.submissionId;

    if (!submissionId) {
      return NextResponse.json(
        { error: "Missing submissionId." },
        { status: 400 }
      );
    }

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (submissionError) {
      return NextResponse.json(
        { error: submissionError.message },
        { status: 500 }
      );
    }

    const { data: assignment } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .eq("id", submission.assignment_id)
      .maybeSingle();

    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: `
You are an educational diagnostics system.

Return ONLY valid JSON.
Do not use markdown.
Do not explain.

Format:
[
  {
    "topic": "...",
    "weakness_score": 1,
    "evidence": "..."
  }
]

Rules:
- Extract concrete academic weaknesses from the student's submitted homework and marking feedback.
- Use short canonical topic names.
- Examples:
  "Rational Equations"
  "Restrictions"
  "Cross Multiplication"
  "Extraneous Solutions"
  "Factoring"
  "Sign Errors"
  "Domain and Range"
- weakness_score must be from 1 to 5.
- Only include actual weaknesses supported by evidence.
- Do not include topics the student did correctly.
          `,
        },
        {
          role: "user",
          content: `
Assignment title:
${assignment?.title ?? "Unknown assignment"}

Assignment LaTeX source:
${assignment?.latex_source ?? "No assignment source available."}

Tutor-corrected transcription:
${submission.tutor_corrected_transcription ?? "No corrected transcription."}

AI feedback:
${submission.ai_feedback ?? "No AI feedback."}

Extract the student's academic weaknesses.
          `,
        },
      ],
    });

    const parsed = JSON.parse(response.output_text);

    for (const weakness of parsed) {
      const topic = String(weakness.topic ?? "").trim();
      if (!topic) continue;

      const incomingScore = Math.min(
        Math.max(Number(weakness.weakness_score ?? 1), 1),
        5
      );

      const evidence = String(weakness.evidence ?? "").trim();

      const { data: existingRows } = await supabaseAdmin
        .from("student_weakness_profiles")
        .select("*")
        .eq("student_id", submission.student_id)
        .ilike("topic", topic)
        .limit(1);

      const existing = existingRows?.[0];

      if (existing) {
  const oldScore = Number(existing.weakness_score ?? 1);

  const blendedScore = Math.round(0.6 * oldScore + 0.4 * incomingScore);
  const newScore = Math.min(Math.max(blendedScore + 1, 1), 5);

  await supabaseAdmin
    .from("student_weakness_profiles")
    .update({
      weakness_score: newScore,
      evidence,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      source: "submission",
    })
    .eq("id", existing.id);
} else {
        await supabaseAdmin.from("student_weakness_profiles").insert({
          student_id: submission.student_id,
          topic,
          weakness_score: incomingScore,
          evidence,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
          source: "submission",
        });
      }
    }

    return NextResponse.json({
      message: "Submission weaknesses extracted.",
      count: parsed.length,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: String(err),
      },
      {
        status: 500,
      }
    );
  }
}