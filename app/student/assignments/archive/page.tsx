"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Assignment = {
  id: string;
  title: string | null;
  description: string | null;
  created_at: string;
};

export default function ArchivedAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    async function loadAssignments() {
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
        .from("assignments")
        .select("*")
        .eq("student_id", student.id)
        .lt("created_at", twoWeeksAgo)
        .is("trashed_at", null)
        .order("created_at", { ascending: false });

      setAssignments(data || []);
    }

    loadAssignments();
  }, []);

  return (
    <main className="min-h-screen bg-[#080808] px-8 py-16 text-[#e8e8e8]">
      <section className="relative mx-auto max-w-[900px]">
        <Link href="/student/assignments" className="text-[#777] hover:text-white">
          ← back
        </Link>

        <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em]">
          archived assignments.
        </h1>

        <div className="mt-12 space-y-6">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="border border-white/10 p-6">
              <h2 className="text-xl">{assignment.title ?? "Untitled"}</h2>
              <p className="mt-3 text-[#888]">{assignment.description}</p>
              <p className="mt-4 text-sm text-[#666]">
                Created: {formatVancouverDate(assignment.created_at)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}