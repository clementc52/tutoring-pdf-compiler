"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Assignment = {
  id: string;
  title: string;
  due_date: string | null;
  status: string | null;
};

export default function SubmissionsPage() {
  const [studentId, setStudentId] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAssignments() {
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

      setStudentId(student.id);

      const { data } = await supabase
        .from("assignments")
        .select("id, title, due_date, status")
        .eq("student_id", student.id)
        .order("due_date", { ascending: true });

      setAssignments(data || []);
    }

    loadAssignments();
  }, []);

  async function handleUpload() {
    if (!assignmentId) {
      setMessage("Please select an assignment first.");
      return;
    }

    if (!file) {
      setMessage("Please choose a file first.");
      return;
    }

    const formData = new FormData();
formData.append("studentId", studentId);
formData.append("assignmentId", assignmentId);
formData.append("file", file);

const response = await fetch("/api/student/create-submission", {
  method: "POST",
  body: formData,
});

const result = await response.json();

if (!response.ok) {
  setMessage(result.error ?? "Upload failed.");
  console.error(result);
  return;
}

    await supabase
      .from("assignments")
      .update({ status: "submitted" })
      .eq("id", assignmentId);

    setMessage("Submission uploaded successfully.");
    setFile(null);
    setAssignmentId("");
  }

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
          submissions.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Select an assignment and upload completed homework.
        </p>

        <div className="mt-16 max-w-[800px] border border-[#ffffff18] bg-[#ffffff03] p-6">
          <select
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
            className="w-full border border-[#ffffff18] bg-[#080808] px-5 py-4 text-[#aaa]"
          >
            <option value="">Select assignment</option>

            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.title}
                {assignment.due_date
  ? ` - due ${formatVancouverDate(assignment.due_date)}`
  : ""}
                {assignment.status ? ` — ${assignment.status}` : ""}
              </option>
            ))}
          </select>

          <div className="mt-8">
            <label className="inline-flex cursor-pointer items-center justify-center border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] transition-all duration-300 hover:border-[#ffffff35] hover:text-white">
              choose file
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
          </div>

          {file && (
            <p className="mt-6 text-[15px] text-[#888]">
              Selected: {file.name}
            </p>
          )}

          <button
            onClick={handleUpload}
            className="mt-8 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] transition-all duration-300 hover:border-[#ffffff35] hover:text-white"
          >
            upload
          </button>

          {message && (
            <p className="mt-6 text-[15px] text-[#888]">
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}