"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

type Submission = {
  id: string;
  created_at: string;
  assignment_id: string | null;
  student_id: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string | null;
  ai_feedback: string | null;
  tutor_feedback: string | null;
  ai_transcription: string | null;
  tutor_corrected_transcription: string | null;
  marked_at: string | null;
  score: number | null;
};

export default function SubmissionReviewPage() {
  const params = useParams();
  const submissionId = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [tutorFeedback, setTutorFeedback] = useState("");
  const [aiTranscription, setAiTranscription] = useState("");
  const [correctedTranscription, setCorrectedTranscription] = useState("");
  const [message, setMessage] = useState("");
  const [score, setScore] = useState("");

  async function loadSubmission() {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setSubmission(data);
    setTutorFeedback(data.tutor_feedback ?? "");
    setAiTranscription(data.ai_transcription ?? "");
    setCorrectedTranscription(data.tutor_corrected_transcription ?? "");
    setScore(data.score?.toString() ?? "");
  }

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  async function generateAiFeedback() {
    if (aiTranscription && !correctedTranscription) {
      setMessage("Please save the transcription before generating feedback.");
      return;
    }

    setMessage("Generating AI feedback...");

    const response = await fetch("/api/ai/mark-submission", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error ?? "AI feedback failed.");
      return;
    }

    setMessage(result.message ?? "AI feedback generated.");
    loadSubmission();
  }

  async function extractSubmissionWeaknesses() {
    setMessage("Extracting weaknesses from submission...");

    const response = await fetch("/api/ai/extract-submission-weaknesses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error ?? "Weakness extraction failed.");
      return;
    }

    setMessage(result.message ?? "Submission weaknesses extracted.");
  }

  async function saveTranscription() {
    const textToSave = correctedTranscription || aiTranscription;

    const { error } = await supabase
      .from("submissions")
      .update({
        tutor_corrected_transcription: textToSave,
      })
      .eq("id", submissionId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setCorrectedTranscription(textToSave);
    setMessage("Transcription saved.");
    loadSubmission();
  }

  async function saveTutorFeedback() {
    const { error } = await supabase
      .from("submissions")
      .update({
        tutor_feedback: tutorFeedback,
        score: score ? Number(score) : null,
        status: "reviewed",
      })
      .eq("id", submissionId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Tutor feedback saved.");
    loadSubmission();
  }

  if (!submission) {
    return (
      <main className="min-h-screen bg-[#080808] p-16 text-[#e8e8e8]">
        Loading...
      </main>
    );
  }

  const transcriptionValue = correctedTranscription || aiTranscription;

  return (
    <main className="min-h-screen bg-[#080808] px-8 py-16 text-[#e8e8e8]">
      <section className="mx-auto max-w-[1300px]">
        <Link
          href="/tutor/submissions"
          className="text-[13px] tracking-[0.22em] text-[#777] hover:text-white"
        >
          ← back
        </Link>

        <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em]">
          submission review.
        </h1>

        <p className="mt-6 text-[#888]">
          Status: {submission.status ?? "submitted"}
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="border border-[#ffffff18] bg-[#ffffff03] p-8">
            <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
              submitted file
            </p>

            {submission.file_url ? (
              <iframe
                src={submission.file_url}
                className="mt-6 h-[760px] w-full border border-[#ffffff18]"
              />
            ) : (
              <p className="mt-6 text-[#777]">No file URL found.</p>
            )}
          </div>

          <div className="space-y-8">
            <div className="border border-[#ffffff18] bg-[#ffffff03] p-8">
              <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                ai transcription
              </p>

              <p className="mt-4 text-[#777]">
                First let AI transcribe the visible student work. Correct any
                handwriting mistakes here before trusting the marking.
              </p>

              <textarea
                value={transcriptionValue}
                onChange={(e) => setCorrectedTranscription(e.target.value)}
                placeholder="AI transcription will appear here. Correct it before generating final feedback."
                className="mt-6 min-h-[260px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
              />

              <button
                onClick={saveTranscription}
                className="mt-6 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
              >
                save transcription
              </button>
            </div>

            <div className="border border-[#ffffff18] bg-[#ffffff03] p-8">
              <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                ai feedback
              </p>

              <div className="mt-6 min-h-[220px] overflow-auto border border-[#ffffff18] p-5 text-[#bbb]">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {submission.ai_feedback ?? "No AI feedback yet."}
                </ReactMarkdown>
              </div>

              <button
                onClick={generateAiFeedback}
                className="mt-8 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
              >
                {correctedTranscription
                  ? "generate ai feedback"
                  : aiTranscription
                    ? "save transcription first"
                    : "generate transcription"}
              </button>

              <button
                onClick={extractSubmissionWeaknesses}
                className="mt-4 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
              >
                extract weaknesses
              </button>
            </div>

            <div className="border border-[#ffffff18] bg-[#ffffff03] p-8">
              <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                tutor feedback
              </p>

              <textarea
                value={tutorFeedback}
                onChange={(e) => setTutorFeedback(e.target.value)}
                placeholder="Write feedback to the student..."
                className="mt-6 min-h-[240px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
              />

              <input
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="score"
                className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
              />

              <button
                onClick={saveTutorFeedback}
                className="mt-8 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
              >
                save feedback
              </button>

              {message && <p className="mt-6 text-[#888]">{message}</p>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}