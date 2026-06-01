"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Submission = {
  id: string;
  created_at: string;
  ai_feedback: string | null;
  tutor_feedback: string | null;
  file_name: string | null;
};

export default function ArchivedFeedbackPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    async function loadFeedback() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!student) return;

      const twoWeeksAgo = new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_id", student.id)
        .lt("created_at", twoWeeksAgo)
        .is("trashed_at", null)
        .order("created_at", { ascending: false });

      setSubmissions(data || []);
    }

    loadFeedback();
  }, []);

  return (
    <main className="min-h-screen bg-[#080808] px-8 py-16 text-[#e8e8e8]">
      <section className="relative mx-auto max-w-[900px]">
        <Link href="/student/feedback" className="text-[#777] hover:text-white">
          ← back
        </Link>

        <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em]">
          archived feedback.
        </h1>

        <div className="mt-12 space-y-6">
          {submissions.map((submission) => (
            <div key={submission.id} className="border border-white/10 p-6">
              <h2 className="text-xl">
                {submission.file_name ?? "Feedback"}
              </h2>

              <p className="mt-4 whitespace-pre-wrap text-[#bbb]">
                {submission.tutor_feedback ||
                  submission.ai_feedback ||
                  "No feedback text."}
              </p>

              <p className="mt-4 text-sm text-[#666]">
                Created: {formatVancouverDate(submission.created_at)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}