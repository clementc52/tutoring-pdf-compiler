import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI, { toFile } from "openai";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function uploadUrlToOpenAI(url: string, filename: string) {
  const fileResponse = await fetch(url);

  if (!fileResponse.ok) {
    throw new Error(`Could not download file: ${filename}`);
  }

  const arrayBuffer = await fileResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return await openai.files.create({
    file: await toFile(buffer, filename, {
      type: filename.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : "image/png",
    }),
    purpose: "assistants",
  });
}

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

    if (!submission?.file_url) {
      return NextResponse.json(
        { error: "Submission has no file_url." },
        { status: 400 }
      );
    }

    const { data: assignment } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .eq("id", submission.assignment_id)
      .maybeSingle();

    const correctedTranscription =
      submission.tutor_corrected_transcription?.trim();

    if (!correctedTranscription) {
      const submissionFile = await uploadUrlToOpenAI(
        submission.file_url,
        submission.file_name ?? "student-submission.pdf"
      );

      const transcriptionResponse = await openai.responses.create({
        model: "gpt-5.4-mini",
        input: [
          {
            role: "system",
            content: `
You are a careful handwritten math transcription assistant.

Your only job is to transcribe the student's visible handwritten work.

Rules:
- Do NOT mark.
- Do NOT correct mistakes.
- Do NOT infer missing steps.
- Do NOT solve the questions.
- If handwriting is unclear, write [unclear].
- If a symbol is unclear, write [unclear symbol].
- Preserve question numbers if visible.
- Preserve wrong algebra exactly as written.
- If the student skipped a question, do not invent it.
- Be conservative.

Return only this structure:

Visible Student Work Transcription:
-
            `,
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
Please transcribe this student's submitted homework.

Assignment title:
${assignment?.title ?? "Unknown assignment"}

Original assignment LaTeX source for context:
${assignment?.latex_source ?? "No LaTeX source available."}

Important:
Use the assignment only to understand question numbering/context.
Do not use it to fill in missing student work.
                `,
              },
              {
                type: "input_file",
                file_id: submissionFile.id,
              },
            ],
          },
        ],
      });

      const aiTranscription = transcriptionResponse.output_text;

      const { error: updateError } = await supabaseAdmin
        .from("submissions")
        .update({
          ai_transcription: aiTranscription,
          status: "transcribed",
          marked_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      try {
  const origin = new URL(request.url).origin;

  await fetch(`${origin}/api/ai/extract-submission-weaknesses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      submissionId,
    }),
  });
} catch (weaknessError) {
  console.error("AUTO WEAKNESS EXTRACTION FAILED");
  console.error(weaknessError);
}

try {
  const origin = new URL(request.url).origin;

  await fetch(`${origin}/api/ai/update-learning-map-from-submission`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      submissionId,
    }),
  });
} catch (learningMapError) {
  console.error("AUTO LEARNING MAP UPDATE FAILED");
  console.error(learningMapError);
}

      return NextResponse.json({
        message:
          "AI transcription generated. Please review and save the transcription, then generate feedback again.",
      });
    }

    const feedbackResponse = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: `
You are an expert math tutor marking homework.

You are given:
1. The original assignment LaTeX/source.
2. A tutor-confirmed transcription of the student's work.

Use the transcription as the source of truth for the student's submitted work.
Do not use handwriting guesses.
Do not invent missing steps.
Do not mark work that is not present in the transcription.

Formatting rules:

- Output in Markdown.

- All mathematical expressions must be written in LaTeX.

- Use single-dollar delimiters for inline math, for example: $x=3$.

- Use double-dollar delimiters for displayed equations, for example:

$$

\\frac{2}{x-1}=\\frac{5}{x+2}

$$

- Do NOT output raw LaTeX commands without math delimiters.

- Do NOT use \$begin:math:text$ \.\.\. \\$end:math:text$ or \\[ ... \\). Use $...$ and $$...$$ only.

Use this exact structure:

Overall Summary:
-

Question-by-Question Marking:
-

Strengths:
-

Mistakes / Weaknesses:
-

Suggested Follow-Up:
-

Tutor Notes:
-

Be specific, gentle, concise, and useful for a tutor.
          `,
        },
        {
          role: "user",
          content: `
Assignment title:
${assignment?.title ?? "Unknown assignment"}

Assignment description:
${assignment?.description ?? "No description."}

Original assignment LaTeX source:
${assignment?.latex_source ?? "No LaTeX source available."}

Tutor-confirmed student work transcription:
${correctedTranscription}

Please mark the student's work using the assignment source and confirmed transcription.

When writing equations, always use Markdown-compatible LaTeX delimiters:
- inline math: $...$
- displayed math: $$...$$

Do not write raw expressions like \\frac{2}{x-1} outside math delimiters.
          `,
        },
      ],
    });

    const aiFeedback = feedbackResponse.output_text;

    const { error: updateError } = await supabaseAdmin
      .from("submissions")
      .update({
        ai_feedback: aiFeedback,
        status: "ai_marked",
        marked_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    try {
  const origin = new URL(request.url).origin;

  await fetch(`${origin}/api/ai/update-learning-map-from-submission`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      submissionId,
    }),
  });

  await fetch(`${origin}/api/ai/extract-submission-weaknesses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      submissionId,
    }),
  });
} catch (memoryError) {
  console.error("AUTO MEMORY UPDATE FAILED");
  console.error(memoryError);
}

    const origin = new URL(request.url).origin;

await fetch(`${origin}/api/ai/extract-submission-weaknesses`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    submissionId,
  }),
});

await fetch(`${origin}/api/ai/update-learning-map-from-submission`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    submissionId,
  }),
});

    return NextResponse.json({
      message: "AI feedback generated from confirmed transcription.",
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