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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const studentId = body.studentId;
    const summary = body.summary ?? "";
    const weaknesses = body.weaknesses ?? "";
    const nextLessonPlan = body.nextLessonPlan ?? "";

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId." }, { status: 400 });
    }

    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: `
Return ONLY valid JSON.

Format:
[
  {
    "topic": "...",
    "mastery_score": 0-10,
    "status": "not_started" | "learning" | "weak" | "reviewing" | "mastered",
    "evidence": "..."
  }
]

Extract topics the student is currently learning or recently practiced.
This is NOT only weaknesses. This is the student's learning map.
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

    const parsed = JSON.parse(response.output_text);

    for (const item of parsed) {
      const topic = String(item.topic ?? "").trim();
      if (!topic) continue;

      const { data: existingRows } = await supabaseAdmin
        .from("student_learning_topics")
        .select("*")
        .eq("student_id", studentId)
        .ilike("topic", topic)
        .limit(1);

      const existing = existingRows?.[0];

      if (existing) {
        await supabaseAdmin
          .from("student_learning_topics")
          .update({
            mastery_score: item.mastery_score,
            status: item.status,
            evidence: item.evidence,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("student_learning_topics").insert({
          student_id: studentId,
          topic,
          mastery_score: item.mastery_score,
          status: item.status,
          evidence: item.evidence,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      message: "Learning map updated.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}