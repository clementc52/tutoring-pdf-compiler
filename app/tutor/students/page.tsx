"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  grade: string | null;
  school: string | null;
  subject: string | null;
};

export default function TutorStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    async function loadStudents() {
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name, email, grade, school, subject")
        .order("first_name", { ascending: true });

      setStudents(data || []);
    }

    loadStudents();
  }, []);

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
          students.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          View all student profiles.
        </p>

        <div className="mt-16 space-y-6">
          {students.length === 0 && (
            <div className="border border-[#ffffff18] p-8 text-[#777]">
              No students found.
            </div>
          )}

          {students.map((student) => (
            <div
              key={student.id}
              className="border border-[#ffffff18] bg-[#ffffff03] p-8"
            >
              <h2 className="text-[24px] uppercase tracking-[0.12em]">
                {student.first_name} {student.last_name ?? ""}
              </h2>

              <p className="mt-4 text-[#888]">
                Email: {student.email}
              </p>

              {student.subject && (
                <p className="mt-3 text-[#888]">
                  Subject: {student.subject}
                </p>
              )}

              {student.grade && (
                <p className="mt-3 text-[#888]">
                  Grade: {student.grade}
                </p>
              )}

              {student.school && (
                <p className="mt-3 text-[#888]">
                  School: {student.school}
                </p>
              )}

              <Link
                href={`/tutor/students/${student.id}`}
                className="mt-6 inline-block border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
              >
                open profile
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}