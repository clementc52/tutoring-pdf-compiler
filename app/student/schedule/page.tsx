"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Lesson = {
  id: string;
  lesson_date: string;
  duration_minutes: number | null;
  status: string | null;
  notes: string | null;
  zoom_link: string | null;
};

export default function SchedulePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    async function loadLessons() {
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

      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("student_id", student.id)
        .order("lesson_date", { ascending: true });

      setLessons(data || []);
    }

    loadLessons();
  }, []);

  const now = new Date();

  const upcomingLessons = lessons.filter(
    (lesson) => new Date(lesson.lesson_date) >= now
  );

  const pastLessons = lessons.filter(
    (lesson) => new Date(lesson.lesson_date) < now
  );

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
          schedule.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Upcoming and past lessons.
        </p>

        {/* UPCOMING LESSONS */}

        <h2 className="mt-16 text-[32px] tracking-[-0.03em]">
          upcoming lessons.
        </h2>

        <div className="mt-8 space-y-6">
          {upcomingLessons.length === 0 ? (
            <div className="border border-[#ffffff18] bg-[#ffffff03] p-8 text-[#777]">
              No upcoming lessons.
            </div>
          ) : (
            upcomingLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="border border-[#ffffff18] bg-[#ffffff03] p-8"
              >
                <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                  lesson
                </p>

                <h3 className="mt-4 text-[24px] uppercase tracking-[0.12em]">
                  {formatVancouverDate(lesson.lesson_date)}
                </h3>

                <p className="mt-4 text-[#888]">
                  Duration: {lesson.duration_minutes ?? 60} minutes
                </p>

                <p className="mt-4 text-[#888]">
                  Status: {lesson.status ?? "scheduled"}
                </p>

                {lesson.notes && (
                  <p className="mt-4 text-[#888]">
                    Topic: {lesson.notes}
                  </p>
                )}

                {lesson.zoom_link && (
                  <a
                    href={lesson.zoom_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-block border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                  >
                    join lesson
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        {/* PAST LESSONS */}

        <h2 className="mt-20 text-[32px] tracking-[-0.03em]">
          lesson history.
        </h2>

        <div className="mt-8 space-y-6">
          {pastLessons.length === 0 ? (
            <div className="border border-[#ffffff18] bg-[#ffffff03] p-8 text-[#777]">
              No previous lessons.
            </div>
          ) : (
            pastLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="border border-[#ffffff18] bg-[#ffffff03] p-8"
              >
                <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                  completed lesson
                </p>

                <h3 className="mt-4 text-[24px] uppercase tracking-[0.12em]">
                  {formatVancouverDate(lesson.lesson_date)}
                </h3>

                <p className="mt-4 text-[#888]">
                  Duration: {lesson.duration_minutes ?? 60} minutes
                </p>

                {lesson.notes && (
                  <p className="mt-4 text-[#888]">
                    Topic: {lesson.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}