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
You are an educational mastery-tracking system.

Return ONLY valid JSON.
Do not use markdown.
Do not explain.

Format:
[
  {
    "topic": "...",
    "mastery_score": 0-10,
    "confidence_score": 0-10,
    "status": "not_started" | "learning" | "weak" | "reviewing" | "mastered",
    "evidence": "..."
  }
]

Rules:
- Extract topics demonstrated in the submitted homework.
- mastery_score measures how well the student currently understands the topic.
- confidence_score measures how confident we are based on the submitted evidence.
- Use short canonical topic names.
- Include both strengths and weak topics when supported.
- Do not hallucinate topics not present in the assignment/submission/feedback.
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

Update the student's learning map based on this submitted homework.
          `,
        },
      ],
    });

    const parsed = JSON.parse(response.output_text);

    for (const item of parsed) {
      const topic = String(item.topic ?? "").trim();
      if (!topic) continue;

      const masteryScore = Math.min(
        Math.max(Number(item.mastery_score ?? 0), 0),
        10
      );

      const confidenceScore = Math.min(
        Math.max(Number(item.confidence_score ?? 0), 0),
        10
      );

      const status = String(item.status ?? "learning");
      const evidence = String(item.evidence ?? "");

      const { data: existingRows } = await supabaseAdmin
        .from("student_learning_topics")
        .select("*")
        .eq("student_id", submission.student_id)
        .ilike("topic", topic)
        .limit(1);

      const existing = existingRows?.[0];

      if (existing) {
  const oldMastery = Number(existing.mastery_score ?? masteryScore);
  const oldConfidence = Number(existing.confidence_score ?? confidenceScore);

  const blendedMastery = Math.round(0.65 * oldMastery + 0.35 * masteryScore);
  const blendedConfidence = Math.round(
    Math.max(oldConfidence, confidenceScore)
  );

  await supabaseAdmin
    .from("student_learning_topics")
    .update({
      mastery_score: blendedMastery,
      confidence_score: blendedConfidence,
      status,
      evidence,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: "submission",
    })
    .eq("id", existing.id);
} else {
        await supabaseAdmin.from("student_learning_topics").insert({
          student_id: submission.student_id,
          topic,
          mastery_score: masteryScore,
          confidence_score: confidenceScore,
          status,
          evidence,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          source: "submission",
        });
      }
    }

    return NextResponse.json({
      message: "Learning map updated from submission.",
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