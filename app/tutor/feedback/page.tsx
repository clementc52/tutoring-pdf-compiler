"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Submission = {
  id: string;
  created_at: string;
  assignment_id: string | null;
  student_id: string | null;
  tutor_feedback: string | null;
  ai_feedback: string | null;
  score: number | null;
  status: string | null;
};

type Assignment = {
  id: string;
  title: string;
};

export default function TutorFeedbackPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [editingId, setEditingId] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [editScore, setEditScore] = useState("");
  const [message, setMessage] = useState("");

  async function loadFeedback() {
    const twoWeeksAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: submissionData } = await supabase
      .from("submissions")
      .select("id, created_at, assignment_id, student_id, tutor_feedback, ai_feedback, score, status")
      .gte("created_at", twoWeeksAgo)
      .is("archived_at", null)
      .is("trashed_at", null)
      .or("tutor_feedback.not.is.null,ai_feedback.not.is.null")
      .order("created_at", { ascending: true });

    setSubmissions(submissionData || []);

    const { data: assignmentData } = await supabase
      .from("assignments")
      .select("id, title");

    setAssignments(assignmentData || []);
  }

  useEffect(() => {
    loadFeedback();
  }, []);

  function assignmentTitle(id: string | null) {
    if (!id) return "Unlinked submission";
    return assignments.find((a) => a.id === id)?.title ?? "Unknown assignment";
  }

  function startEditing(submission: Submission) {
    setEditingId(submission.id);
    setEditFeedback(submission.tutor_feedback || submission.ai_feedback || "");
    setEditScore(submission.score?.toString() ?? "");
  }

  async function saveEdit(id: string) {
    const { error } = await supabase
      .from("submissions")
      .update({
        tutor_feedback: editFeedback,
        score: editScore ? Number(editScore) : null,
        status: "reviewed",
      })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Feedback updated.");
    setEditingId("");
    setEditFeedback("");
    setEditScore("");
    loadFeedback();
  }

  return (
    <main className="min-h-screen bg-[#080808] px-8 py-16 text-[#e8e8e8]">
      <section className="mx-auto max-w-[1100px]">
        <Link
          href="/tutor/dashboard"
          className="text-[13px] tracking-[0.22em] text-[#777] hover:text-white"
        >
          ← back
        </Link>

        <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em]">
          feedback.
        </h1>

        <Link
          href="/tutor/feedback/archive"
          className="mt-6 inline-block border border-white/10 px-5 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-white/30 hover:text-white"
        >
          archived feedback
        </Link>

        {message && <p className="mt-6 text-[#888]">{message}</p>}

        <div className="mt-16 space-y-6">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="border border-[#ffffff18] bg-[#ffffff03] p-8"
            >
              <h2 className="text-[24px] uppercase tracking-[0.12em]">
                {assignmentTitle(submission.assignment_id)}
              </h2>

              <p className="mt-4 text-[#777]">
                Submitted: {formatVancouverDate(submission.created_at)}
              </p>

              {editingId === submission.id ? (
                <>
                  <textarea
                    value={editFeedback}
                    onChange={(e) => setEditFeedback(e.target.value)}
                    className="mt-6 min-h-[180px] w-full border border-white/10 bg-transparent p-5 text-[#ddd] outline-none"
                  />

                  <input
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    placeholder="score"
                    className="mt-6 w-full border border-white/10 bg-transparent p-5 text-[#ddd] outline-none"
                  />

                  <button
                    onClick={() => saveEdit(submission.id)}
                    className="mt-6 border border-white/10 px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:text-white"
                  >
                    save changes
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-4 text-white">
                    Score: {submission.score ?? "pending"}
                  </p>

                  <p className="mt-4 whitespace-pre-wrap text-[#888]">
                    Feedback:{" "}
                    {submission.tutor_feedback ||
                      submission.ai_feedback ||
                      "pending"}
                  </p>

                  <button
                    onClick={() => startEditing(submission)}
                    className="mt-6 border border-white/10 px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:text-white"
                  >
                    edit feedback
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}