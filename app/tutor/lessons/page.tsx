"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
};

type Lesson = {
  id: string;
  student_id: string;
  lesson_date: string;
  duration_minutes: number | null;
  zoom_link: string | null;
  status: string | null;
  notes: string | null;
  trashed_at: string | null;
};

export default function TutorLessonsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [zoomLink, setZoomLink] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);

  async function loadLessons() {
    const { data } = await supabase
  .from("lessons")
  .select("*")
  .is("trashed_at", null)
  .order("lesson_date", { ascending: true });

    setLessons(data || []);
  }

  useEffect(() => {
    async function loadStudents() {
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .order("first_name", { ascending: true });

      setStudents(data || []);
    }

    loadStudents();
    loadLessons();
  }, []);


  async function createLesson() {
    if (!studentId || !lessonDate) {
      setMessage("Please select a student and lesson date.");
      return;
    }

    const { error } = await supabase.from("lessons").insert({
      student_id: studentId,
      lesson_date: lessonDate ? new Date(lessonDate).toISOString() : null,
      duration_minutes: Number(durationMinutes),
      zoom_link: zoomLink || null,
      status: "scheduled",
      notes,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Lesson created.");
    setStudentId("");
    setLessonDate("");
    setDurationMinutes("60");
    setZoomLink("");
    setNotes("");
    loadLessons();
  }

  async function trashLesson(id: string) {
  const response = await fetch(
    "/api/admin/trash-lesson",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lessonId: id,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    setMessage(result.error ?? "Failed.");
    return;
  }

  setMessage("Lesson moved to trash.");

  loadLessons();
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
          lessons.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Schedule lessons and attach Zoom links.
        </p>

        <div className="mt-16 max-w-[850px] border border-[#ffffff18] bg-[#ffffff03] p-8">
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full border border-[#ffffff18] bg-[#080808] px-5 py-4 text-[#aaa]"
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name ?? ""}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            value={lessonDate}
            onChange={(e) => setLessonDate(e.target.value)}
            className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none"
          />

          <input
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="duration minutes"
            className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <input
            value={zoomLink}
            onChange={(e) => setZoomLink(e.target.value)}
            placeholder="zoom link"
            className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="lesson notes / topic"
            className="mt-6 min-h-[120px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <button
            onClick={createLesson}
            className="mt-8 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
          >
            create lesson
          </button>

          {message && <p className="mt-6 text-[#888]">{message}</p>}
        </div>

        <div className="mt-16 space-y-6">
          {lessons.map((lesson) => {
            const student = students.find((s) => s.id === lesson.student_id);

            return (
              <div
                key={lesson.id}
                className="border border-[#ffffff18] bg-[#ffffff03] p-8"
              >
                <h2 className="text-[22px] uppercase tracking-[0.12em]">
                    <p className="mt-2 text-red-400">
  {lesson.id}
</p>
                  {student
                    ? `${student.first_name} ${student.last_name ?? ""}`
                    : "Unknown student"}
                </h2>

                <p className="mt-4 text-[#888]">
                  {formatVancouverDate(lesson.lesson_date)}
                </p>

                <p className="mt-4 text-[#777]">
                  Duration: {lesson.duration_minutes ?? 0} minutes
                </p>

                <p className="mt-4 text-[#777]">
                  Status: {lesson.status ?? "scheduled"}
                </p>

                {lesson.notes && (
                  <p className="mt-4 text-[#888]">
                    Notes: {lesson.notes}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-4">
                  {lesson.zoom_link && (
                    <a
                      href={lesson.zoom_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                    >
                      open zoom
                    </a>
                  )}

                  <Link
                    href={`/tutor/lessons/${lesson.id}`}
                    className="inline-block border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                  >
                    lesson notes
                  </Link>

                  <button
  onClick={() => trashLesson(lesson.id)}
  className="inline-block border border-red-500/20 px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-red-400 hover:border-red-500/50"
>
  trash
</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}