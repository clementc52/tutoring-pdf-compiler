"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AppSidebar from "@/components/AppSidebar";

type StudentRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  grade: string | null;
  school: string | null;
  subject: string | null;
  auth_user_id: string | null;
};

type ParentRow = {
  parent_user_id: string;
  student_id: string;
  parent_name: string | null;
  parent_email: string | null;
  student_first_name: string | null;
  student_last_name: string | null;
};

export default function StudentsAdminPage() {
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState("");

  const [grade, setGrade] = useState("");
  const [school, setSchool] = useState("");
  const [subject, setSubject] = useState("");

  const [message, setMessage] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [parents, setParents] = useState<ParentRow[]>([]);

  async function loadStudents() {
    const { data } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    setStudents(data || []);
  }

  async function loadParents() {
    const { data: links } = await supabase
      .from("parent_students")
      .select("parent_user_id, student_id");

    if (!links || links.length === 0) {
      setParents([]);
      return;
    }

    const parentIds = links.map((link) => link.parent_user_id);
    const studentIds = links.map((link) => link.student_id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", parentIds);

    const { data: linkedStudents } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .in("id", studentIds);

    const rows: ParentRow[] = links.map((link) => {
      const profile = profiles?.find((p) => p.id === link.parent_user_id);
      const student = linkedStudents?.find((s) => s.id === link.student_id);

      return {
        parent_user_id: link.parent_user_id,
        student_id: link.student_id,
        parent_name: profile?.display_name ?? null,
        parent_email: profile?.email ?? null,
        student_first_name: student?.first_name ?? null,
        student_last_name: student?.last_name ?? null,
      };
    });

    setParents(rows);
  }

  async function loadAll() {
    await loadStudents();
    await loadParents();
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createFamily() {
    setMessage("Creating family...");

    const response = await fetch("/api/admin/create-student-family", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentName,
        studentEmail,
        studentPassword,
        parentName,
        parentEmail,
        parentPassword,
        grade,
        school,
        subject,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error ?? "Failed.");
      return;
    }

    setMessage("Family created successfully.");

    setStudentName("");
    setStudentEmail("");
    setStudentPassword("");
    setParentName("");
    setParentEmail("");
    setParentPassword("");
    setGrade("");
    setSchool("");
    setSubject("");

    loadAll();
  }

  return (
    <main className="min-h-screen bg-[#080808] py-10 pl-28 pr-10 text-white">
        <AppSidebar role="admin" />
      <Link
        href="/tutor/dashboard"
        className="mb-8 inline-block text-[13px] tracking-[0.22em] text-[#777] hover:text-white"
      >
        ← back
      </Link>

      <h1 className="mb-10 text-5xl">Students Admin</h1>

      <div className="max-w-[700px] space-y-4">
        <input
          placeholder="Student Name"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="w-full border border-white/20 bg-black p-4"
        />

        <input
          placeholder="Student Email"
          value={studentEmail}
          onChange={(e) => setStudentEmail(e.target.value)}
          className="w-full border border-white/20 bg-black p-4"
        />

        <input
          placeholder="Student Password"
          value={studentPassword}
          onChange={(e) => setStudentPassword(e.target.value)}
          className="w-full border border-white/20 bg-black p-4"
        />

        <input
          placeholder="Parent Name"
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
          className="w-full border border-white/20 bg-black p-4"
        />

        <input
          placeholder="Parent Email"
          value={parentEmail}
          onChange={(e) => setParentEmail(e.target.value)}
          className="w-full border border-white/20 bg-black p-4"
        />

        <input
          placeholder="Parent Password"
          value={parentPassword}
          onChange={(e) => setParentPassword(e.target.value)}
          className="w-full border border-white/20 bg-black p-4"
        />

        <input
          placeholder="Grade"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-full border border-white/20 bg-black p-4"
        />

        <input
          placeholder="School"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          className="w-full border border-white/20 bg-black p-4"
        />

        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full border border-white/20 bg-black p-4"
        />

        <button
          onClick={createFamily}
          className="border border-white/20 px-6 py-3"
        >
          CREATE FAMILY
        </button>

        {message && <p className="mt-4 text-[#888]">{message}</p>}
      </div>

      <div className="mt-16 overflow-x-auto border border-white/10">
        <h2 className="p-4 text-2xl">Students</h2>

        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-[#888]">
              <th className="border border-white/10 p-3">Student</th>
              <th className="border border-white/10 p-3">Email</th>
              <th className="border border-white/10 p-3">Grade</th>
              <th className="border border-white/10 p-3">School</th>
              <th className="border border-white/10 p-3">Subject</th>
              <th className="border border-white/10 p-3">Auth User ID</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td className="border border-white/10 p-3">
                  {student.first_name} {student.last_name}
                </td>

                <td className="border border-white/10 p-3">
                  {student.email ?? "-"}
                </td>

                <td className="border border-white/10 p-3">
                  {student.grade ?? "-"}
                </td>

                <td className="border border-white/10 p-3">
                  {student.school ?? "-"}
                </td>

                <td className="border border-white/10 p-3">
                  {student.subject ?? "-"}
                </td>

                <td className="border border-white/10 p-3 font-mono text-xs">
                  {student.auth_user_id ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-16 overflow-x-auto border border-white/10">
        <h2 className="p-4 text-2xl">Linked Parents</h2>

        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-[#888]">
              <th className="border border-white/10 p-3">Parent</th>
              <th className="border border-white/10 p-3">Parent Email</th>
              <th className="border border-white/10 p-3">Linked Student</th>
              <th className="border border-white/10 p-3">Parent Auth ID</th>
            </tr>
          </thead>

          <tbody>
            {parents.map((parent) => (
              <tr key={`${parent.parent_user_id}-${parent.student_id}`}>
                <td className="border border-white/10 p-3">
                  {parent.parent_name ?? "-"}
                </td>

                <td className="border border-white/10 p-3">
                  {parent.parent_email ?? "-"}
                </td>

                <td className="border border-white/10 p-3">
                  {parent.student_first_name ?? "-"}{" "}
                  {parent.student_last_name ?? ""}
                </td>

                <td className="border border-white/10 p-3 font-mono text-xs">
                  {parent.parent_user_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}