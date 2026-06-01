"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Submission = {
  id: string;
  created_at: string;
  assignment_id: string | null;
  file_url: string | null;
  ai_feedback: string | null;
  tutor_feedback: string | null;
  score: number | null;
};

type Assignment = {
  id: string;
  title: string;
};

export default function FeedbackPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    async function loadFeedback() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!student) return;

      const twoWeeksAgo = new Date(
  Date.now() - 14 * 24 * 60 * 60 * 1000
).toISOString();

      const { data: submissionData } = await supabase
        .from("submissions")
        .select("id, created_at, assignment_id, file_url, ai_feedback, tutor_feedback, score")
        .eq("student_id", student.id)
        .gte("created_at", twoWeeksAgo)
.is("archived_at", null)
.is("trashed_at", null)
        .order("created_at", { ascending: false });

      setSubmissions(submissionData || []);

      const { data: assignmentData } = await supabase
        .from("assignments")
        .select("id, title")
        .eq("student_id", student.id);

      setAssignments(assignmentData || []);
    }

    loadFeedback();
  }, []);

  function assignmentTitle(id: string | null) {
    if (!id) return "Unlinked submission";
    return assignments.find((a) => a.id === id)?.title ?? "Unknown assignment";
  }

  return (
    <main className="min-h-screen bg-[#080808] px-8 py-16 text-[#e8e8e8]">
      <section className="mx-auto max-w-[1100px]">
        <Link
          href="/student/dashboard"
          className="text-[13px] tracking-[0.22em] text-[#777] hover:text-white"
        >
          ← back
        </Link>

        <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em]">
          feedback.
        </h1>

        <Link
  href="/student/feedback/archive"
  className="mt-6 inline-block border border-white/10 px-5 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-white/30 hover:text-white"
>
  archived feedback
</Link>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Marked submissions and tutor comments.
        </p>

        <div className="mt-16 space-y-6">
          {submissions.length === 0 && (
            <div className="border border-[#ffffff18] p-8 text-[#777]">
              No feedback released yet.
            </div>
          )}

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

              <p className="mt-4 text-white">
                Score: {submission.score ?? "pending"}
              </p>

              <p className="mt-4 text-[#888]">
                Feedback: {submission.tutor_feedback || submission.ai_feedback || "pending"}
              </p>

              {submission.file_url && (
                <a
                  href={submission.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-block text-[#bbbbbb] hover:text-white"
                >
                  View submitted file →
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}