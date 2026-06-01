"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";


type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  subject: string | null;
};

type LessonNote = {
  id: string;
  created_at: string;
  summary: string | null;
  weaknesses: string | null;
  homework_status: string | null;
  upcoming_tests: string | null;
  next_lesson_plan: string | null;
};

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string | null;
};

type Submission = {
  id: string;
  created_at: string;
  assignment_id: string | null;
  file_url: string | null;
  feedback: string | null;
  score: number | null;
};

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      setStudent(studentData);

      const { data: notesData } = await supabase
        .from("lesson_notes")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      setNotes(notesData || []);

      const { data: assignmentData } = await supabase
        .from("assignments")
        .select("*")
        .eq("student_id", studentId)
        .order("due_date", { ascending: false });

      setAssignments(assignmentData || []);

      const { data: submissionData } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      setSubmissions(submissionData || []);
    }

    loadData();
  }, [studentId]);

  if (!student) {
    return (
      <main className="min-h-screen bg-[#080808] p-16 text-[#e8e8e8]">
        Loading...
      </main>
    );
  }

  function assignmentTitle(assignmentId: string | null) {
    if (!assignmentId) return "Unlinked submission";

    const assignment = assignments.find((a) => a.id === assignmentId);
    return assignment?.title ?? "Unknown assignment";
  }

  return (
    <main className="min-h-screen bg-[#080808] px-8 py-16 text-[#e8e8e8]">
      <section className="mx-auto max-w-[1100px]">
        <Link
          href="/tutor/students"
          className="text-[13px] tracking-[0.22em] text-[#777] hover:text-white"
        >
          ← back
        </Link>

        <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em]">
          {student.first_name}.
        </h1>

        <div className="mt-12 border border-[#ffffff18] p-8">
          <p>Email: {student.email}</p>
          <p className="mt-4">Subject: {student.subject ?? "Not set"}</p>
        </div>

        <h2 className="mt-16 text-[32px] tracking-[-0.03em]">
  lesson history.
</h2>

<div className="mt-8 space-y-6">
  {notes.length === 0 && (
    <div className="border border-[#ffffff18] p-8 text-[#777]">
      No lesson notes yet.
    </div>
  )}

  {notes.map((note) => (
    <div
      key={note.id}
      className="border border-[#ffffff18] bg-[#ffffff03] p-8"
    >
      <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
        {formatVancouverDate(note.created_at)}
      </p>

      {note.summary && (
        <div className="mt-6">
          <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
            summary
          </p>
          <p className="mt-2 text-[#bbb]">{note.summary}</p>
        </div>
      )}

      {note.weaknesses && (
        <div className="mt-6">
          <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
            weaknesses
          </p>
          <p className="mt-2 text-[#bbb]">{note.weaknesses}</p>
        </div>
      )}

      {note.homework_status && (
        <div className="mt-6">
          <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
            homework status
          </p>
          <p className="mt-2 text-[#bbb]">{note.homework_status}</p>
        </div>
      )}

      {note.upcoming_tests && (
        <div className="mt-6">
          <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
            upcoming tests / activities
          </p>
          <p className="mt-2 text-[#bbb]">{note.upcoming_tests}</p>
        </div>
      )}

      {note.next_lesson_plan && (
        <div className="mt-6">
          <p className="text-[12px] uppercase tracking-[0.25em] text-[#666]">
            next lesson plan
          </p>
          <p className="mt-2 text-[#bbb]">{note.next_lesson_plan}</p>
        </div>
      )}
    </div>
  ))}
</div>
        <h2 className="mt-16 text-[32px] tracking-[-0.03em]">
          assignments.
        </h2>

        <div className="mt-8 space-y-6">
          {assignments.length === 0 && (
            <div className="border border-[#ffffff18] p-8 text-[#777]">
              No assignments yet.
            </div>
          )}

          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="border border-[#ffffff18] bg-[#ffffff03] p-8"
            >
              <h3 className="text-[22px]">{assignment.title}</h3>

              {assignment.description && (
                <p className="mt-4 text-[#888]">{assignment.description}</p>
              )}

              {assignment.due_date && (
                <p className="mt-4 text-[#777]">
                  Due: {formatVancouverDate(assignment.due_date)}
                </p>
              )}

              <p className="mt-4 text-white">Status: {assignment.status}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-16 text-[32px] tracking-[-0.03em]">
          submissions.
        </h2>

        <div className="mt-8 space-y-6">
          {submissions.length === 0 && (
            <div className="border border-[#ffffff18] p-8 text-[#777]">
              No submissions yet.
            </div>
          )}

          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="border border-[#ffffff18] bg-[#ffffff03] p-8"
            >
              <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                submission
              </p>

              <h3 className="mt-4 text-[22px] uppercase tracking-[0.12em]">
                {assignmentTitle(submission.assignment_id)}
              </h3>

              <p className="mt-4 text-[#777]">
                Uploaded: {formatVancouverDate(submission.created_at)}
              </p>

              <p className="mt-4 text-[#777]">
                Score: {submission.score ?? "pending"}
              </p>

              <p className="mt-4 text-[#777]">
                Feedback: {submission.feedback ?? "pending"}
              </p>

              {submission.file_url && (
                <Link
  href={`/tutor/submissions/${submission.id}`}
  className="mt-6 inline-block border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
>
  mark submission
</Link>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

