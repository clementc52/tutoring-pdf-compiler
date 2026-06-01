"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
  subject: string | null;
  current_learning_topic: string | null;
  current_learning_details: string | null;
  current_learning_updated_at: string | null;
};

type LessonNote = {
  id: string;
  student_id: string;
  created_at: string;
  summary: string | null;
  weaknesses: string | null;
  homework_status: string | null;
  upcoming_tests: string | null;
  next_lesson_plan: string | null;
};

type WeaknessProfile = {
  id: string;
  student_id: string;
  topic: string | null;
  weakness_score: number | null;
  evidence: string | null;
  updated_at: string | null;
};

type LearningTopic = {
  id: string;
  student_id: string;
  topic: string | null;
  mastery_score: number | null;
  status: string | null;
  evidence: string | null;
  last_seen: string | null;
  updated_at: string | null;
};

export default function StudentIntelligencePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [weaknessProfiles, setWeaknessProfiles] = useState<WeaknessProfile[]>(
    []
  );
  const [learningTopics, setLearningTopics] = useState<LearningTopic[]>([]);
  const [message, setMessage] = useState("");

  async function loadData() {
    const { data: studentData } = await supabase
      .from("students")
      .select(
        "id, first_name, last_name, subject, current_learning_topic, current_learning_details, current_learning_updated_at"
      )
      .order("first_name", { ascending: true });

    const { data: noteData } = await supabase
      .from("lesson_notes")
      .select(
        "id, student_id, created_at, summary, weaknesses, homework_status, upcoming_tests, next_lesson_plan"
      )
      .order("created_at", { ascending: false });

    const { data: weaknessData } = await supabase
  .from("student_weakness_profiles")
  .select("*")
  .eq("is_active", true)
  .order("weakness_score", { ascending: false });

    const { data: learningData } = await supabase
      .from("student_learning_topics")
      .select("*")
      .order("last_seen", { ascending: false });

    setStudents(studentData || []);
    setNotes(noteData || []);
    setWeaknessProfiles(weaknessData || []);
    setLearningTopics(learningData || []);
  }

  useEffect(() => {
    loadData();

    const notesChannel = supabase
      .channel("lesson-notes-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lesson_notes",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    const weaknessChannel = supabase
      .channel("weakness-profiles-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_weakness_profiles",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    const learningChannel = supabase
      .channel("learning-topics-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_learning_topics",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notesChannel);
      supabase.removeChannel(weaknessChannel);
      supabase.removeChannel(learningChannel);
    };
  }, []);


  function latestNote(studentId: string) {
    return notes.find((note) => note.student_id === studentId);
  }

  function noteCount(studentId: string) {
    return notes.filter((note) => note.student_id === studentId).length;
  }

  function weaknessesForStudent(studentId: string) {
  return weaknessProfiles
    .filter((weakness) => weakness.student_id === studentId)
    .slice(0, 5);
}

  function learningForStudent(studentId: string) {
    return learningTopics.filter((topic) => topic.student_id === studentId);
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
          intelligence.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Student memory: current learning topic, learning map, structured
          weaknesses, homework status, upcoming tests, and next lesson plans.
        </p>


        {message && <p className="mt-6 text-[#888]">{message}</p>}

        <div className="mt-16 space-y-6">
          {students.map((student) => {
            const note = latestNote(student.id);
            const weaknesses = weaknessesForStudent(student.id);
            const learningMap = learningForStudent(student.id);

            return (
              <div
                key={student.id}
                className="border border-[#ffffff18] bg-[#ffffff03] p-8"
              >
                <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                  student intelligence
                </p>

                <h2 className="mt-4 text-[26px] uppercase tracking-[0.12em]">
                  {student.first_name} {student.last_name ?? ""}
                </h2>

                <p className="mt-4 text-[#777]">
                  Subject: {student.subject ?? "Not set"}
                </p>

                <p className="mt-4 text-[#777]">
                  Lesson notes recorded: {noteCount(student.id)}
                </p>

                <div className="mt-8 border border-[#ffffff18] bg-[#ffffff03] p-5">
                  <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
                    current learning now
                  </p>

                  <p className="mt-3 text-[#bbb]">
                    {student.current_learning_topic ?? "No current topic recorded."}
                  </p>

                  {student.current_learning_details && (
                    <p className="mt-3 whitespace-pre-wrap text-[#777]">
                      {student.current_learning_details}
                    </p>
                  )}

                  {student.current_learning_updated_at && (
                    <p className="mt-3 text-[#555]">
                      Updated:{" "}
                      {formatVancouverDate(
                        student.current_learning_updated_at)}
                    </p>
                  )}
                </div>

                <div className="mt-8">
                  <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
                    learning map
                  </p>

                  <div className="mt-4 space-y-3">
                    {learningMap.length === 0 ? (
                      <p className="text-[#777]">No learning map topics yet.</p>
                    ) : (
                      learningMap.map((topic) => (
                        <div
                          key={topic.id}
                          className="border border-[#ffffff18] bg-[#ffffff03] p-4"
                        >
                          <p className="text-[#bbb]">
                            {topic.topic ?? "Untitled topic"}
                          </p>

                          <div className="mt-3">
  <div className="flex items-center justify-between text-[#777]">
    <span>Mastery</span>
    <span>{topic.mastery_score ?? 0}/10</span>
  </div>

  <div className="mt-2 h-2 w-full bg-[#ffffff10]">
    <div
      className="h-2 bg-[#e8e8e8]"
      style={{
        width: `${Math.min(Math.max(topic.mastery_score ?? 0, 0), 10) * 10}%`,
      }}
    />
  </div>
</div>

                          <p className="mt-2 text-[#777]">
                            Status: {topic.status ?? "learning"}
                          </p>

                          {topic.evidence && (
                            <p className="mt-2 text-[#777]">
                              Evidence: {topic.evidence}
                            </p>
                          )}

                          {topic.last_seen && (
                            <p className="mt-2 text-[#555]">
                              Last seen:{" "}
                              {formatVancouverDate(topic.last_seen)}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-8">
                  <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
                    structured weakness profile
                  </p>

                  <div className="mt-4 space-y-3">
                    {weaknesses.length === 0 ? (
                      <p className="text-[#777]">
                        No structured weaknesses yet.
                      </p>
                    ) : (
                      weaknesses.map((weakness) => (
                        <div
                          key={weakness.id}
                          className="border border-[#ffffff18] bg-[#ffffff03] p-4"
                        >
                          <p className="text-[#bbb]">
                            {weakness.topic ?? "Untitled topic"}
                          </p>

                          <div className="mt-3">
  <div className="flex items-center justify-between text-[#777]">
    <span>Weakness score</span>
    <span>{weakness.weakness_score ?? 1}/5</span>
  </div>

  <div className="mt-2 h-2 w-full bg-[#ffffff10]">
    <div
      className="h-2 bg-[#e8e8e8]"
      style={{
        width: `${Math.min(Math.max(weakness.weakness_score ?? 1, 1), 5) * 20}%`,
      }}
    />
  </div>
</div>

                          {weakness.evidence && (
                            <p className="mt-2 text-[#777]">
                              Evidence: {weakness.evidence}
                            </p>
                          )}

                          {weakness.updated_at && (
                            <p className="mt-2 text-[#555]">
                              Updated:{" "}
                              {formatVancouverDate(
                                weakness.updated_at)}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {note ? (
                  <div className="mt-8 space-y-5">
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
                        latest summary
                      </p>
                      <p className="mt-2 text-[#bbb]">
                        {note.summary ?? "No summary recorded."}
                      </p>
                    </div>

                    <div>
                      <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
                        latest weaknesses
                      </p>
                      <p className="mt-2 text-[#bbb]">
                        {note.weaknesses ?? "No weaknesses recorded."}
                      </p>
                    </div>

                    <div>
                      <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
                        homework status
                      </p>
                      <p className="mt-2 text-[#bbb]">
                        {note.homework_status ??
                          "No homework status recorded."}
                      </p>
                    </div>

                    <div>
                      <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
                        upcoming tests / activities
                      </p>
                      <p className="mt-2 text-[#bbb]">
                        {note.upcoming_tests ??
                          "No upcoming tests recorded."}
                      </p>
                    </div>

                    <div>
                      <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
                        next lesson plan
                      </p>
                      <p className="mt-2 text-[#bbb]">
                        {note.next_lesson_plan ??
                          "No next lesson plan recorded."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-8 text-[#777]">No lesson history yet.</p>
                )}

                <Link
                  href={`/tutor/students/${student.id}`}
                  className="mt-8 inline-block border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                >
                  open profile
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}