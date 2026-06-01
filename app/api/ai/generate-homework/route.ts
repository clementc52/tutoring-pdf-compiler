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

function escapeLatexText(value: string) {
  return value
    .replaceAll("\\", "\\textbackslash{}")
    .replaceAll("&", "\\&")
    .replaceAll("%", "\\%")
    .replaceAll("$", "\\$")
    .replaceAll("#", "\\#")
    .replaceAll("_", "\\_")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("~", "\\textasciitilde{}")
    .replaceAll("^", "\\textasciicircum{}");
}

async function uploadUrlToOpenAI(url: string, filename: string) {
  const fileResponse = await fetch(url);

  if (!fileResponse.ok) {
    throw new Error(`Could not download reference file: ${filename}`);
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

function buildWorksheetTemplate({
  subject,
  topic,
  questionSections,
}: {
  subject: string;
  topic: string;
  questionSections: string;
}) {
  const safeSubject = escapeLatexText(subject);
  const safeTopic = escapeLatexText(topic);

  return `
\\documentclass[11pt]{article}

% ----------------------------
% PAGE
% ----------------------------
\\usepackage[a4paper, margin=1in]{geometry}
\\usepackage{amsmath, amsfonts, amsthm, amssymb}
\\usepackage{mathrsfs}

% ----------------------------
% SPACING
% ----------------------------
\\usepackage{setspace}
\\setstretch{1.15}

% ----------------------------
% HEADER
% ----------------------------
\\usepackage{fancyhdr}
\\pagestyle{fancy}
\\fancyhf{}

\\fancyhead[L]{\\sffamily ${safeSubject}}
\\fancyhead[R]{\\sffamily Problem Set}

\\fancyfoot[C]{\\thepage}

\\renewcommand{\\headrulewidth}{0.4pt}
\\renewcommand{\\footrulewidth}{0pt}

% ----------------------------
% SECTION STYLE (CMSS ONLY HERE)
% ----------------------------
\\usepackage{titlesec}

\\titleformat{\\section}
{\\sffamily\\large\\bfseries}
{}{0em}{}

\\titleformat{\\subsection}
{\\sffamily\\large\\bfseries}
{}{0em}{}

% ----------------------------
% LIST SPACING
% ----------------------------
\\usepackage{enumitem}
\\setlist[itemize]{itemsep=0.4em, topsep=0.4em}

\\begin{document}

\\begin{center}
    {\\sffamily\\Large \\bfseries Problem Set: ${safeTopic}}
    
    \\vspace{0.5em}
    {\\sffamily ${safeSubject}}\\\\
    {\\sffamily 2026}
\\end{center}

\\vspace{1.5em}
\\hrule

\\vspace{0.8em}
\\begin{center}
    \\textbf{\\sffamily{Name:}}\\\\
    \\large{\\sffamily{\\textbf{Please complete the problems in a separate piece of paper.}}}
\\end{center}

\\section*{General Instructions}

\\begin{itemize}
    \\item Show all steps clearly and logically.
    \\item Write your solutions neatly and legibly.
\\end{itemize}

\\vspace{0.5cm}

\\textbf{Please complete the following sections:}

\\begin{itemize}
    \\item Section A: \\textbf{Mandatory}
    \\item Section B: \\textbf{Mandatory}
    \\item Section C: \\textbf{Optional BUT strongly recommended}
\\end{itemize}

\\vspace{5cm}


\\vfill

\\hrule

\\vspace{0.3cm}

\\newpage

${questionSections}

\\end{document}
`;
}

export async function POST(request: Request) {
  try {
    const origin = new URL(request.url).origin;

    const body = await request.json().catch(() => ({}));
    const jobId = body.jobId;

    let jobQuery = supabaseAdmin
      .from("ai_jobs")
      .select("*")
      .eq("job_type", "generate_homework");

    if (jobId) {
      jobQuery = jobQuery.eq("id", jobId);
    } else {
      jobQuery = jobQuery.eq("status", "pending").order("created_at", {
        ascending: true,
      });
    }

    const { data: job, error: jobError } = await jobQuery
      .limit(1)
      .maybeSingle();

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({ message: "No pending homework jobs." });
    }

    await supabaseAdmin
      .from("ai_jobs")
      .update({ status: "running" })
      .eq("id", job.id);

    const studentId = job.student_id;

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    const subject = student?.subject ?? "Pre-Calculus 12";

    const { data: notes } = await supabaseAdmin
      .from("lesson_notes")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(5);

    const latestNote = notes?.[0];

    const currentLearningTopic =
      latestNote?.next_lesson_plan ||
      latestNote?.summary ||
      student?.current_learning_topic ||
      student?.subject ||
      "Current Lesson Topic";

    const { data: weaknessProfiles } = await supabaseAdmin
      .from("student_weakness_profiles")
      .select("*")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .order("weakness_score", { ascending: false })
      .limit(5);

    const { data: learningTopics } = await supabaseAdmin
      .from("student_learning_topics")
      .select("*")
      .eq("student_id", studentId)
      .order("mastery_score", { ascending: true })
      .limit(8);

    const { data: questionBankItems } = await supabaseAdmin
      .from("question_bank_items")
      .select("*")
      .or(`course.ilike.%${subject}%,topic.ilike.%${currentLearningTopic}%`)
      .limit(20);

    const questionBankText =
      questionBankItems
        ?.map(
          (q, index) =>
            `Question Bank Item ${index + 1}
Course: ${q.course ?? "N/A"}
Topic: ${q.topic ?? "N/A"}
Difficulty: ${q.difficulty ?? "N/A"}
Question: ${q.question_text ?? "N/A"}
Solution: ${q.solution_text ?? "N/A"}
Tags: ${(q.tags ?? []).join(", ")}
`
        )
        .join("\n\n") || "No matching question bank items found.";

    const { data: referenceFiles } = await supabaseAdmin
      .from("homework_reference_files")
      .select("*")
      .eq("ai_job_id", job.id)
      .order("created_at", { ascending: false });

    const referenceContent: any[] = [];

    for (const file of referenceFiles || []) {
      if (!file.file_url) continue;

      const uploadedReference = await uploadUrlToOpenAI(
        file.file_url,
        file.file_name ?? "reference.pdf"
      );

      referenceContent.push({
        type: "input_file",
        file_id: uploadedReference.id,
      });
    }

    let referenceAnalysis = "No reference file provided.";

    if (referenceContent.length > 0) {
      const referenceResponse = await openai.responses.create({
        model: "gpt-5.4-mini",
        input: [
          {
            role: "system",
            content: `
You are analyzing uploaded school reference files for homework generation.

Return a concise but specific analysis.

You MUST identify:
1. Main topic
2. Subtopics
3. Question types
4. Difficulty level
5. Notation/style
6. What a similar worksheet should test

If the uploaded file is unrelated to the student's course/topic, say so clearly.
Do not ignore the file.
            `,
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
Analyze the uploaded reference file(s).
This analysis will be used to generate a new homework worksheet.
                `,
              },
              ...referenceContent,
            ],
          },
        ],
      });

      referenceAnalysis = referenceResponse.output_text;
    }

    const currentLearningDetails =
      notes
        ?.map(
          (note) =>
            `Lesson summary: ${note.summary ?? "N/A"}\nWeaknesses: ${
              note.weaknesses ?? "N/A"
            }\nNext lesson plan: ${note.next_lesson_plan ?? "N/A"}`
        )
        .join("\n\n") || "No current learning details recorded.";

    await supabaseAdmin
      .from("students")
      .update({
        current_learning_topic: currentLearningTopic,
        current_learning_details: currentLearningDetails,
        current_learning_updated_at: new Date().toISOString(),
      })
      .eq("id", studentId);

    const latestWeaknesses =
      weaknessProfiles
        ?.map(
          (w) =>
            `Topic: ${w.topic}; Score: ${w.weakness_score}; Evidence: ${w.evidence}`
        )
        .join("\n") || "No active weaknesses recorded.";

    const learningMapText =
      learningTopics
        ?.map(
          (t) =>
            `Topic: ${t.topic}; Mastery: ${t.mastery_score}/10; Status: ${t.status}; Evidence: ${t.evidence}`
        )
        .join("\n") || "No learning map recorded.";

    const latestSummary =
      notes
        ?.map((note) => note.summary)
        .filter(Boolean)
        .join("\n") || "No lesson summaries recorded.";

    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: `
You are an expert mathematics tutor writing ONLY the question-body section of a LaTeX worksheet.

Return ONLY LaTeX beginning with:
\\section{Section A: Conceptual Questions}

Do NOT include:
- \\documentclass
- \\usepackage
- \\begin{document}
- title block
- General Instructions
- Academic Integrity
- \\end{document}
- markdown fences
- explanations outside LaTeX

You may use only:
\\section
\\subsection
\\begin{itemize}
\\end{itemize}
\\begin{enumerate}
\\end{enumerate}
display math with \$begin:math:display$\.\.\.\\$end:math:display$
inline math with $...$

Do not include solutions unless explicitly requested.

Source priority:
1. Uploaded school reference file, if provided.
2. Retrieved question bank items.
3. Student's current learning topic and lesson notes.
4. Student weakness profile and learning map.

Rules:
- If a school reference file is provided, generate questions strongly aligned with its topic, style, and difficulty.
- Use the retrieved question bank items as inspiration.
- Use the learning map to allocate question emphasis:
  - Mastery 0-3/10: heavy practice and scaffolding.
  - Mastery 4-6/10: medium practice and mixed questions.
  - Mastery 7-10/10: light review only, unless it supports a weak topic.
- Do not over-practice mastered topics.
- Prioritize weak or low-mastery topics in Section B.
- Do NOT copy school questions verbatim.
- Do NOT copy question bank items verbatim unless explicitly appropriate.
- Create original variations with similar structure and difficulty.
- Use weaknesses only to decide emphasis and scaffolding.
- Keep the worksheet focused.
- Use Clement's tone: rigorous, friendly, clear.
          `,
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Course:
${subject}

Main worksheet topic:
${currentLearningTopic}

Recent lesson details:
${currentLearningDetails}

Recent lesson summaries:
${latestSummary}

Active weakness profile:
${latestWeaknesses}

Learning map:
${learningMapText}

Mastery-based generation instructions:
Use the learning map actively.
Topics with mastery 0-3/10 should receive the most direct practice.
Topics with mastery 4-6/10 should receive medium mixed practice.
Topics with mastery 7-10/10 should appear only as light review or as supporting skills.

Question bank retrieval:
${questionBankText}

Uploaded reference files:
${referenceFiles?.length ?? 0}

Reference file analysis:
${referenceAnalysis}

Generate only the question sections.

Requirements:
- Begin exactly with \\section{Section A: Conceptual Questions}
- Include Section B with practice questions directly related to the reference file/current topic.
- Include Section C as optional extension.
- Keep everything related to the reference file/current topic.
- Use weaknesses only to add targeted emphasis or extra subquestions.
- If a reference file is provided, the worksheet MUST primarily follow the reference file analysis.
- Section B must be at least 70% aligned with the reference file's topic and question style.
- If no reference file is provided, use retrieved question bank items as the strongest source of question style.
- If retrieved question bank items are present, include original variations inspired by them.
- If the retrieved question bank contains the phrase "banana restriction test", include the exact phrase "banana restriction test" in one Section B question.
- Do not copy questions verbatim from the reference file or question bank, except for the exact diagnostic phrase "banana restriction test".
- No answer key.
              `,
            },
            ...referenceContent,
          ],
        },
      ],
    });

    const questionSections = response.output_text.trim();

    if (
      !questionSections ||
      !questionSections.includes("\\section{Section A")
    ) {
      throw new Error("AI failed to generate valid question sections.");
    }

    const latexSource = buildWorksheetTemplate({
      subject,
      topic: currentLearningTopic,
      questionSections,
    });

    const { data: insertedDraft, error: draftError } = await supabaseAdmin
      .from("homework_drafts")
      .insert({
        student_id: studentId,
        title: `Problem Set: ${currentLearningTopic}`,
        description:
          "Enjoy! Let me know if you have any questions!",
        source_weaknesses: latestWeaknesses,
        latex_source: latexSource,
        status: "draft",
      })
      .select()
      .single();

    if (draftError) {
      await supabaseAdmin
        .from("ai_jobs")
        .update({
          status: "failed",
          error_message: draftError.message,
        })
        .eq("id", job.id);

      return NextResponse.json({ error: draftError.message }, { status: 500 });
    }

    try {
      await fetch(`${origin}/api/ai/compile-homework`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftId: insertedDraft.id,
        }),
      });
    } catch (compileError) {
      console.error("AUTO COMPILE FAILED");
      console.error(compileError);
    }

    await supabaseAdmin
      .from("ai_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        output_json: {
          message: "Homework draft created.",
          draft_id: insertedDraft.id,
          reference_files_used: referenceFiles?.length ?? 0,
          question_bank_items_used: questionBankItems?.length ?? 0,
        },
      })
      .eq("id", job.id);

    return NextResponse.json({
      message: "Homework draft created.",
      job_id: job.id,
      draft_id: insertedDraft.id,
      reference_files_used: referenceFiles?.length ?? 0,
      question_bank_items_used: questionBankItems?.length ?? 0,
    });
  } catch (err: any) {
    console.error("AI ROUTE ERROR");
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