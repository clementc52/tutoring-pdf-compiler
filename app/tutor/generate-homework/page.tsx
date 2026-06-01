"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
  subject: string | null;
};

export default function GenerateHomeworkPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadStudents() {
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name, subject")
        .order("first_name", { ascending: true });

      setStudents(data || []);
    }

    loadStudents();
  }, []);

  async function uploadReferenceFile(aiJobId: string) {
    if (!referenceFile || !studentId) return null;

    const filePath = `${studentId}/${aiJobId}/${Date.now()}-${referenceFile.name}`;

    const { error: uploadError } = await supabase.storage
      .from("homework-reference-files")
      .upload(filePath, referenceFile, {
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from("homework-reference-files")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from("homework_reference_files")
      .insert({
        student_id: studentId,
        ai_job_id: aiJobId,
        file_url: publicUrlData.publicUrl,
        file_name: referenceFile.name,
        status: "uploaded",
      });

    if (insertError) {
      throw new Error(insertError.message);
    }

    return {
      file_url: publicUrlData.publicUrl,
      file_name: referenceFile.name,
    };
  }

  async function createHomeworkJob() {
    if (!studentId) {
      setMessage("Please select a student.");
      return;
    }

    setMessage("Creating AI job...");

    const student = students.find((s) => s.id === studentId);

    const { data: notes, error: notesError } = await supabase
      .from("lesson_notes")
      .select(
        "id, summary, weaknesses, homework_status, upcoming_tests, next_lesson_plan, created_at"
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (notesError) {
      console.error(notesError);
      setMessage(`Notes error: ${notesError.message}`);
      return;
    }

    const { data: insertedJob, error: insertError } = await supabase
      .from("ai_jobs")
      .insert({
        student_id: studentId,
        job_type: "generate_homework",
        status: "pending",
        input_json: {
          student,
          recent_lesson_notes: notes || [],
          has_reference_file: Boolean(referenceFile),
          instruction:
            "Generate a homework worksheet draft based on the student's latest weaknesses, lesson notes, uploaded school handout reference, and question bank.",
        },
      })
      .select("id")
      .single();

    if (insertError || !insertedJob) {
      console.error(insertError);
      setMessage(`AI job insert error: ${insertError?.message}`);
      return;
    }

    try {
      if (referenceFile) {
        setMessage("Uploading school reference file...");
        await uploadReferenceFile(insertedJob.id);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`Reference file upload failed: ${err.message ?? String(err)}`);
      return;
    }

    setMessage("AI job inserted. Calling backend...");

    try {
      const response = await fetch("/api/ai/generate-homework", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: insertedJob.id,
        }),
      });

      const text = await response.text();

      let result: any = {};
      try {
        result = JSON.parse(text);
      } catch {
        setMessage(`Backend returned non-JSON: ${text.slice(0, 120)}`);
        return;
      }

      if (!response.ok) {
        setMessage(result.error ?? "AI route failed.");
        return;
      }

      setMessage(
        `${result.message ?? "Homework draft generated."} Reference files used: ${
          result.reference_files_used ?? 0
        }. Check Homework AI.`
      );

      setReferenceFile(null);
    } catch (err) {
      console.error(err);
      setMessage("Backend crashed. Check terminal.");
    }
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
          generate homework.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Create an AI homework-generation job using lesson history, weaknesses,
          learning map, and optional school handout reference files.
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
                {student.subject ? ` • ${student.subject}` : ""}
              </option>
            ))}
          </select>

          <div className="mt-8 border border-[#ffffff18] bg-[#ffffff03] p-6">
            <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
              optional school handout / reference file
            </p>

            <p className="mt-4 text-[#777]">
              Upload the student's school worksheet, assignment, textbook page,
              or teacher handout. The AI will use it as reference when generating
              the homework.
            </p>

            <label className="mt-6 inline-flex cursor-pointer items-center justify-center border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] transition-all duration-300 hover:border-[#ffffff35] hover:text-white">
              choose reference file
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>

            {referenceFile && (
              <p className="mt-5 text-[#888]">Selected: {referenceFile.name}</p>
            )}
          </div>

          <button
            onClick={createHomeworkJob}
            className="mt-8 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
          >
            create ai job
          </button>

          {message && <p className="mt-6 text-[#888]">{message}</p>}
        </div>
      </section>
    </main>
  );
}