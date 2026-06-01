"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Lesson = {
  id: string;
  student_id: string;
  lesson_date: string;
};

export default function LessonNotesPage() {
  const params = useParams();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);

  const [summary, setSummary] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [homeworkStatus, setHomeworkStatus] = useState("");
  const [upcomingTests, setUpcomingTests] = useState("");
  const [nextLessonPlan, setNextLessonPlan] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");

  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadLesson() {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .single();

      setLesson(data);
    }

    loadLesson();
  }, [lessonId]);

  async function saveLessonNotes() {
    if (!lesson) return;

    const { error } = await supabase
      .from("lesson_notes")
      .insert({
        lesson_id: lesson.id,
        student_id: lesson.student_id,
        summary,
        weaknesses,
        homework_status: homeworkStatus,
        upcoming_tests: upcomingTests,
        next_lesson_plan: nextLessonPlan,
        private_notes: privateNotes,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Lesson notes saved.");
  }

  if (!lesson) {
    return (
      <main className="min-h-screen bg-[#080808] p-16 text-white">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] px-8 py-16 text-[#e8e8e8]">
      <section className="mx-auto max-w-[1000px]">

        <Link
          href="/tutor/lessons"
          className="text-[13px] tracking-[0.22em] text-[#777] hover:text-white"
        >
          ← back
        </Link>

        <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em]">
          lesson notes.
        </h1>

        <p className="mt-4 text-[#777]">
          {formatVancouverDate(lesson.lesson_date)}
        </p>

        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Lesson summary"
          className="mt-10 min-h-[120px] w-full border border-white/10 bg-transparent p-5"
        />

        <textarea
          value={weaknesses}
          onChange={(e) => setWeaknesses(e.target.value)}
          placeholder="Weaknesses observed"
          className="mt-6 min-h-[120px] w-full border border-white/10 bg-transparent p-5"
        />

        <textarea
          value={homeworkStatus}
          onChange={(e) => setHomeworkStatus(e.target.value)}
          placeholder="Homework status"
          className="mt-6 min-h-[120px] w-full border border-white/10 bg-transparent p-5"
        />

        <textarea
          value={upcomingTests}
          onChange={(e) => setUpcomingTests(e.target.value)}
          placeholder="Upcoming quizzes / tests"
          className="mt-6 min-h-[120px] w-full border border-white/10 bg-transparent p-5"
        />

        <textarea
          value={nextLessonPlan}
          onChange={(e) => setNextLessonPlan(e.target.value)}
          placeholder="Next lesson plan"
          className="mt-6 min-h-[120px] w-full border border-white/10 bg-transparent p-5"
        />

        <textarea
          value={privateNotes}
          onChange={(e) => setPrivateNotes(e.target.value)}
          placeholder="Private tutor notes"
          className="mt-6 min-h-[120px] w-full border border-white/10 bg-transparent p-5"
        />

        <button
          onClick={saveLessonNotes}
          className="mt-8 border border-white/10 px-7 py-4 uppercase tracking-[0.22em]"
        >
          save notes
        </button>

        {message && (
          <p className="mt-6 text-[#888]">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}