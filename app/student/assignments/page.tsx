"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string | null;
  file_url: string | null;
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    async function loadAssignments() {
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

      const { data } = await supabase
        .from("assignments")
        .select("*")
        .eq("student_id", student.id)
        .gte("created_at", twoWeeksAgo)
.is("archived_at", null)
.is("trashed_at", null)
        .order("due_date", { ascending: true });

      setAssignments(data || []);
    }

    loadAssignments();
  }, []);

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
          assignments.
        </h1>

        <Link
  href="/student/assignments/archive"
  className="mt-6 inline-block border border-white/10 px-5 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-white/30 hover:text-white"
>
  archived assignments
</Link>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Current homework and practice sets.
        </p>

        <div className="mt-16 space-y-6">
          {assignments.length === 0 && (
            <div className="border border-[#ffffff18] p-8 text-[#777]">
              No assignments posted yet.
            </div>
          )}

          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="border border-[#ffffff18] bg-[#ffffff03] p-8"
            >
              <h2 className="text-[24px] uppercase tracking-[0.12em]">
                {assignment.title}
              </h2>

              {assignment.description && (
                <p className="mt-4 text-[#888]">
                  {assignment.description}
                </p>
              )}

              {assignment.due_date && (
                <p className="mt-4 text-[#777]">
                  Due:{" "}
                  {formatVancouverDate(
                    assignment.due_date)}
                </p>
              )}

              <p className="mt-4">
                Status:{" "}
                <span className="text-white">
                  {assignment.status ?? "assigned"}
                </span>
              </p>

              {assignment.file_url && (
  <a
    href={assignment.file_url}
    target="_blank"
    rel="noreferrer"
    className="mt-6 inline-block border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
  >
    open worksheet
  </a>
)}
            </div>
          ))}
        </div>

      </section>
    </main>
  );
}