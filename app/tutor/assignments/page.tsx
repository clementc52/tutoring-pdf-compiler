"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
};

export default function TutorAssignmentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadStudents() {
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .order("first_name", { ascending: true });

      setStudents(data || []);
    }

    loadStudents();
  }, []);

  async function createAssignment() {
    if (!studentId || !title) {
      setMessage("Please select a student and enter a title.");
      return;
    }

    let fileUrl: string | null = null;

    if (file) {
      const filePath = `${studentId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("assignments")
        .upload(filePath, file);

      if (uploadError) {
        setMessage(uploadError.message);
        return;
      }

      const { data } = supabase.storage
        .from("assignments")
        .getPublicUrl(filePath);

      fileUrl = data.publicUrl;
    }

    const { error } = await supabase.from("assignments").insert({
      student_id: studentId,
      title,
      description,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      file_url: fileUrl,
      status: "assigned",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Assignment created.");
    setStudentId("");
    setTitle("");
    setDescription("");
    setDueDate("");
    setFile(null);
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
          assignments.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Create homework and attach worksheet PDFs.
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="assignment title"
            className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="assignment description"
            className="mt-6 min-h-[120px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none"
          />

          <div className="mt-6">
            <label className="inline-flex cursor-pointer items-center justify-center border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] transition-all duration-300 hover:border-[#ffffff35] hover:text-white">
              choose worksheet
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
          </div>

          {file && (
            <p className="mt-4 text-[#888]">
              Selected: {file.name}
            </p>
          )}

          <button
            onClick={createAssignment}
            className="mt-8 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
          >
            create assignment
          </button>

          {message && <p className="mt-6 text-[#888]">{message}</p>}
        </div>
      </section>
    </main>
  );
}