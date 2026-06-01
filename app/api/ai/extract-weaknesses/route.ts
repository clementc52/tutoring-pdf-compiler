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

function normalizeTopic(topic: string) {
  return topic.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const studentId = body.studentId;
    const summary = body.summary ?? "";
    const weaknesses = body.weaknesses ?? "";
    const nextLessonPlan = body.nextLessonPlan ?? "";

    if (!studentId) {
      return NextResponse.json(
        { error: "Missing studentId." },
        { status: 400 }
      );
    }

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
    "weakness_score": 1-5,
    "evidence": "..."
  }
]

Rules:
- Extract concrete academic weaknesses only.
- Topic names should be short and canonical.
- Examples: "Radical Equations", "Extraneous Solutions", "Domain and Range", "Quadratic Factoring".
- Do not create duplicate topics with slightly different wording.
`,
        },
        {
          role: "user",
          content: `
Lesson Summary:
${summary}

Weaknesses:
${weaknesses}

Next Lesson Plan:
${nextLessonPlan}
`,
        },
      ],
    });

    const output = response.output_text;
    const parsed = JSON.parse(output);

    for (const weakness of parsed) {
      const topic = String(weakness.topic ?? "").trim();

      if (!topic) continue;

      const incomingScore = Number(weakness.weakness_score ?? 1);
      const evidence = String(weakness.evidence ?? "");

      const { data: existingRows } = await supabaseAdmin
        .from("student_weakness_profiles")
        .select("*")
        .eq("student_id", studentId)
        .ilike("topic", topic)
        .limit(1);

      const existing = existingRows?.[0];

      if (existing) {
        const oldScore = Number(existing.weakness_score ?? 1);
        const newScore = Math.min(Math.max(oldScore, incomingScore) + 1, 5);

        await supabaseAdmin
          .from("student_weakness_profiles")
          .update({
            weakness_score: newScore,
            evidence,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true,
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("student_weakness_profiles").insert({
          student_id: studentId,
          topic,
          weakness_score: Math.min(Math.max(incomingScore, 1), 5),
          evidence,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
        });
      }
    }

    return NextResponse.json({
      message: "Weakness extraction complete.",
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