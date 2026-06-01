"use client";

import { useEffect, useState } from "react";
import PortalButton from "@/components/PortalButton";
import AppSidebar from "@/components/AppSidebar";
import DotBackground from "@/components/DotBackground";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Lesson = {
  id: string;
  student_id: string | null;
  lesson_date: string;
  zoom_link: string | null;
  notes: string | null;
  status: string | null;
};

type Student = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type Submission = {
  id: string;
  created_at: string;
  status: string | null;
};

export default function TutorDashboard() {
  const [lessonsToday, setLessonsToday] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
  const [lessonSoon, setLessonSoon] = useState<Lesson | null>(null);

  useEffect(() => {
    async function loadCommandCenter() {
      const now = new Date();

      const start = new Date(now);
      start.setHours(0, 0, 0, 0);

      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .gte("lesson_date", start.toISOString())
        .lte("lesson_date", end.toISOString())
        .is("trashed_at", null)
        .order("lesson_date", { ascending: true });

      setLessonsToday(lessonData || []);

      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name");

      setStudents(studentData || []);

      const { data: submissionData } = await supabase
        .from("submissions")
        .select("id, created_at, status")
        .neq("status", "reviewed")
        .is("archived_at", null)
        .is("trashed_at", null)
        .order("created_at", { ascending: true });

      setPendingSubmissions(submissionData || []);

      const upcoming = (lessonData || []).find((lesson) => {
        const diffMinutes =
          (new Date(lesson.lesson_date).getTime() - Date.now()) /
          (1000 * 60);

        return diffMinutes >= 0 && diffMinutes <= 30;
      });

      setLessonSoon(upcoming ?? null);
    }

    loadCommandCenter();

    const interval = setInterval(loadCommandCenter, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  function studentName(id: string | null) {
    if (!id) return "Unknown student";

    const student = students.find((s) => s.id === id);

    if (!student) return "Unknown student";

    return `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim();
  }

  return (
    <main className="min-h-screen bg-[#080808] text-[#e8e8e8]">
      <DotBackground />
      <AppSidebar role="admin" />

      <section className="relative mx-auto min-h-screen max-w-[1100px] px-8 py-24 pl-28">
        <p className="text-[13px] uppercase tracking-[0.32em] text-[#777]">
          • Tutor Dashboard
        </p>

        <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em]">
          command center.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Manage students, lessons, assignments, submissions, feedback,
          payments, lesson notes, and AI workflows.
        </p>

        {lessonSoon && (
          <div className="mt-10 border border-red-500/20 bg-red-500/[0.03] p-6">
            <p className="text-[12px] uppercase tracking-[0.3em] text-red-400">
              lesson soon
            </p>

            <p className="mt-4 text-[#ddd]">
              {studentName(lessonSoon.student_id)} has a lesson at{" "}
              {formatVancouverDate(lessonSoon.lesson_date)}.
            </p>

            {lessonSoon.zoom_link && (
              <a
                href={lessonSoon.zoom_link}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:text-white"
              >
                open zoom →
              </a>
            )}
          </div>
        )}

        <div className="mt-12 border border-[#ffffff10] p-8">
          <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
            today&apos;s briefing
          </p>

          <div className="mt-6 space-y-6 text-[#bbb]">
            <div>
              <p className="text-white">Lessons today: {lessonsToday.length}</p>

              <div className="mt-3 space-y-3">
                {lessonsToday.length === 0 && (
                  <p className="text-[#777]">No lessons scheduled today.</p>
                )}

                {lessonsToday.map((lesson) => (
                  <div key={lesson.id} className="border border-white/10 p-4">
                    <p>
                      {studentName(lesson.student_id)} —{" "}
                      {formatVancouverDate(lesson.lesson_date)}
                    </p>

                    {lesson.notes && (
                      <p className="mt-2 text-[#888]">Talk about: {lesson.notes}</p>
                    )}

                    {lesson.zoom_link && (
                      <a
                        href={lesson.zoom_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:text-white"
                      >
                        open zoom →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-white">
                Pending homework to mark: {pendingSubmissions.length}
              </p>

              {pendingSubmissions.length > 0 && (
                <p className="mt-2 text-[#888]">
                  Check submissions and return feedback.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-16 flex max-w-[900px] flex-wrap gap-4">
          <PortalButton href="/tutor/students">students</PortalButton>
          <PortalButton href="/tutor/lessons">lessons</PortalButton>
          <PortalButton href="/tutor/assignments">assignments</PortalButton>
          <PortalButton href="/tutor/submissions">submissions</PortalButton>
          <PortalButton href="/tutor/feedback">feedback</PortalButton>
          <PortalButton href="/tutor/payments">payments</PortalButton>
          <PortalButton href="/tutor/lesson-notes">lesson notes</PortalButton>
          <PortalButton href="/tutor/homework-ai">homework ai</PortalButton>
          <PortalButton href="/tutor/reports">reports</PortalButton>
          <PortalButton href="/tutor/student-intelligence">intelligence</PortalButton>
          <PortalButton href="/tutor/question-bank">question bank</PortalButton>
          <PortalButton href="/tutor/settings">settings</PortalButton>
          <PortalButton href="/tutor/drive-sync">drive sync</PortalButton>
          <PortalButton href="/tutor/generate-homework">generate homework</PortalButton>
          <PortalButton href="/tutor/learning-dashboard">learning dashboard</PortalButton>
          <PortalButton href="/tutor/students-admin">students admin</PortalButton>
        </div>
      </section>

      <footer className="relative z-10 pointer-events-none mt-20 border-t border-[#ffffff10] py-5">
        <div className="mt-10 text-[#555] text-sm">
          © Copyright Clement & Leo 2026
        </div>
      </footer>
    </main>
  );
}