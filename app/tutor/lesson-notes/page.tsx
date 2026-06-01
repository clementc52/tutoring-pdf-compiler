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

type LessonNote = {
  id: string;
  created_at: string;
  summary: string | null;
  weaknesses: string | null;
  homework_status: string | null;
  upcoming_tests: string | null;
  next_lesson_plan: string | null;
  private_notes: string | null;
};

export default function LessonNotesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [studentId, setStudentId] = useState("");
  const [summary, setSummary] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [homeworkStatus, setHomeworkStatus] = useState("");
  const [upcomingTests, setUpcomingTests] = useState("");
  const [nextLessonPlan, setNextLessonPlan] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [message, setMessage] = useState("");

  async function loadStudents() {
    const { data } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .order("first_name", { ascending: true });

    setStudents(data || []);
  }

  async function loadNotes(selectedStudentId: string) {
    const { data } = await supabase
      .from("lesson_notes")
      .select("*")
      .eq("student_id", selectedStudentId)
      .order("created_at", { ascending: false });

    setNotes(data || []);
  }

  useEffect(() => {
    loadStudents();
  }, []);

  async function saveNote() {
    if (!studentId) {
      setMessage("Please select a student.");
      return;
    }

    setMessage("Saving lesson note...");

    const { error } = await supabase.from("lesson_notes").insert({
      student_id: studentId,
      summary,
      weaknesses,
      homework_status: homeworkStatus,
      upcoming_tests: upcomingTests,
      next_lesson_plan: nextLessonPlan,
      private_notes: privateNotes,
    });

    if (error) {
      console.error(error);
      setMessage(`Failed to save lesson note: ${error.message}`);
      return;
    }

    setMessage("Lesson note saved. Extracting weaknesses with AI...");

    try {
      const response = await fetch("/api/ai/extract-weaknesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          summary,
          weaknesses,
          nextLessonPlan,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error ?? "Lesson note saved, but AI weakness extraction failed."
        );
        return;
      }
    } catch (err) {
      console.error(err);
      setMessage("Lesson note saved, but AI weakness extraction crashed.");
      return;
    }

    setMessage("Updating learning map...");

    try {
      const learningResponse = await fetch("/api/ai/extract-learning-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          summary,
          weaknesses,
          nextLessonPlan,
        }),
      });

      const learningResult = await learningResponse.json();

      if (!learningResponse.ok) {
        setMessage(
          learningResult.error ??
            "Lesson note saved, but learning map update failed."
        );
        return;
      }

      setMessage("Lesson note saved. Weaknesses and learning map updated.");
    } catch (err) {
      console.error(err);
      setMessage("Lesson note saved, but learning map update crashed.");
      return;
    }

    setSummary("");
    setWeaknesses("");
    setHomeworkStatus("");
    setUpcomingTests("");
    setNextLessonPlan("");
    setPrivateNotes("");

    loadNotes(studentId);
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
          lesson notes.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Record lesson summaries, weaknesses, upcoming tests, and next lesson
          plans.
        </p>

        <div className="mt-16 max-w-[850px] border border-[#ffffff18] bg-[#ffffff03] p-8">
          <select
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              if (e.target.value) loadNotes(e.target.value);
            }}
            className="w-full border border-[#ffffff18] bg-[#080808] px-5 py-4 text-[#aaa]"
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name ?? ""}
              </option>
            ))}
          </select>

          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="lesson summary"
            className="mt-6 min-h-[110px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <textarea
            value={weaknesses}
            onChange={(e) => setWeaknesses(e.target.value)}
            placeholder="weaknesses observed"
            className="mt-6 min-h-[110px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <textarea
            value={homeworkStatus}
            onChange={(e) => setHomeworkStatus(e.target.value)}
            placeholder="homework status"
            className="mt-6 min-h-[90px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <textarea
            value={upcomingTests}
            onChange={(e) => setUpcomingTests(e.target.value)}
            placeholder="upcoming tests / quizzes / school activities"
            className="mt-6 min-h-[90px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <textarea
            value={nextLessonPlan}
            onChange={(e) => setNextLessonPlan(e.target.value)}
            placeholder="next lesson plan"
            className="mt-6 min-h-[110px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <textarea
            value={privateNotes}
            onChange={(e) => setPrivateNotes(e.target.value)}
            placeholder="private tutor notes"
            className="mt-6 min-h-[90px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <button
            onClick={saveNote}
            className="mt-8 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] transition-all duration-300 hover:border-[#ffffff35] hover:text-white"
          >
            save note
          </button>

          {message && <p className="mt-6 text-[#888]">{message}</p>}
        </div>

        <div className="mt-16 space-y-6">
          {notes.map((note) => (
            <div
              key={note.id}
              className="border border-[#ffffff18] bg-[#ffffff03] p-8"
            >
              <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                {formatVancouverDate(note.created_at)}
              </p>

              {note.summary && (
                <p className="mt-6 text-[#bbb]">Summary: {note.summary}</p>
              )}

              {note.weaknesses && (
                <p className="mt-4 text-[#bbb]">
                  Weaknesses: {note.weaknesses}
                </p>
              )}

              {note.homework_status && (
                <p className="mt-4 text-[#bbb]">
                  Homework: {note.homework_status}
                </p>
              )}

              {note.upcoming_tests && (
                <p className="mt-4 text-[#bbb]">
                  Upcoming: {note.upcoming_tests}
                </p>
              )}

              {note.next_lesson_plan && (
                <p className="mt-4 text-[#bbb]">
                  Next: {note.next_lesson_plan}
                </p>
              )}

              {note.private_notes && (
                <p className="mt-4 text-[#777]">
                  Private: {note.private_notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}