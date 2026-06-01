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
};

type LearningTopic = {
  id: string;
  student_id: string;
  topic: string | null;
  mastery_score: number | null;
  status: string | null;
  evidence: string | null;
  last_seen: string | null;
};

export default function LearningDashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [topics, setTopics] = useState<LearningTopic[]>([]);

  async function loadData() {
    const { data: studentData } = await supabase
      .from("students")
      .select("id, first_name, last_name, subject, current_learning_topic")
      .order("first_name", { ascending: true });

    const { data: topicData } = await supabase
      .from("student_learning_topics")
      .select("*")
      .order("mastery_score", { ascending: true });

    setStudents(studentData || []);
    setTopics(topicData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  function topicsForStudent(studentId: string) {
    return topics.filter((topic) => topic.student_id === studentId);
  }

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
          learning dashboard.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          A high-level map of what each student is learning, reviewing, and struggling with.
        </p>

        <div className="mt-16 space-y-8">
          {students.map((student) => {
            const studentTopics = topicsForStudent(student.id);

            return (
              <div
                key={student.id}
                className="border border-[#ffffff18] bg-[#ffffff03] p-8"
              >
                <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                  student learning map
                </p>

                <h2 className="mt-4 text-[26px] uppercase tracking-[0.12em]">
                  {student.first_name} {student.last_name ?? ""}
                </h2>

                <p className="mt-4 text-[#777]">
                  Subject: {student.subject ?? "Not set"}
                </p>

                <p className="mt-4 text-[#777]">
                  Current topic: {student.current_learning_topic ?? "Not recorded"}
                </p>

                <div className="mt-8 space-y-4">
                  {studentTopics.length === 0 ? (
                    <p className="text-[#777]">No learning topics yet.</p>
                  ) : (
                    studentTopics.map((topic) => {
                      const score = topic.mastery_score ?? 0;

                      return (
                        <div
                          key={topic.id}
                          className="border border-[#ffffff18] bg-[#ffffff03] p-5"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-[18px] text-[#bbb]">
                                {topic.topic ?? "Untitled topic"}
                              </p>

                              <p className="mt-2 text-[#777]">
                                Status: {topic.status ?? "learning"}
                              </p>
                            </div>

                            <p className="text-[28px] tracking-[-0.04em] text-[#ddd]">
                              {score}/10
                            </p>
                          </div>

                          <div className="mt-4 h-2 w-full bg-[#ffffff10]">
                            <div
                              className="h-2 bg-[#e8e8e8]"
                              style={{
                                width: `${Math.min(Math.max(score, 0), 10) * 10}%`,
                              }}
                            />
                          </div>

                          {topic.evidence && (
                            <p className="mt-4 text-[#777]">
                              Evidence: {topic.evidence}
                            </p>
                          )}

                          {topic.last_seen && (
                            <p className="mt-3 text-[#555]">
                              Last seen: {formatVancouverDate(topic.last_seen)}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}