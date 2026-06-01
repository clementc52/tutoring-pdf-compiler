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
  file_url: string | null;
  file_name: string | null;
  status: string | null;
};

export default function TutorSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  async function loadSubmissions() {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setSubmissions(data || []);
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  return (
    <main className="min-h-screen bg-[#080808] px-8 py-16 text-[#e8e8e8]">
      <section className="mx-auto max-w-[1200px]">
        <Link
          href="/tutor/dashboard"
          className="text-[13px] tracking-[0.22em] text-[#777] hover:text-white"
        >
          ← back
        </Link>

        <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em]">
          submissions.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Review submitted homework files before AI marking and tutor feedback.
        </p>

        <div className="mt-16 space-y-6">
          {submissions.length === 0 ? (
            <div className="border border-[#ffffff18] bg-[#ffffff03] p-8 text-[#777]">
              No submissions yet.
            </div>
          ) : (
            submissions.map((submission) => (
              <div
                key={submission.id}
                className="border border-[#ffffff18] bg-[#ffffff03] p-8"
              >
                <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                  {submission.status ?? "submitted"}
                </p>

                <h2 className="mt-4 text-[24px] uppercase tracking-[0.12em]">
                  Submission
                </h2>

                <p className="mt-4 text-[#777]">
                  Student ID: {submission.student_id ?? "None"}
                </p>

                <p className="mt-3 text-[#777]">
                  Assignment ID: {submission.assignment_id ?? "None"}
                </p>

                <p className="mt-3 text-[#777]">
                  File: {submission.file_name ?? "Unnamed file"}
                </p>

                <p className="mt-3 text-[#555]">
                  Submitted: {formatVancouverDate(submission.created_at)}
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  {submission.file_url && (
                    <a
                      href={submission.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                    >
                      open file
                    </a>
                  )}

                  <Link
                    href={`/tutor/submissions/${submission.id}`}
                    className="border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                  >
                    review
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}