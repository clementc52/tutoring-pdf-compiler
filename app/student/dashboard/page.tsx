"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PortalButton from "@/components/PortalButton";
import DotBackground from "@/components/DotBackground";
import StudentAlertRail from "@/components/StudentAlertRail";
import { formatVancouverDate } from "@/lib/time";

type Lesson = {
  lesson_date: string;
  duration_minutes: number | null;
  zoom_link: string | null;
  status: string | null;
  notes: string | null;
};

type Student = {
  id: string;
  first_name: string;
  subject: string | null;
};

export default function StudentDashboard() {
  const [firstName, setFirstName] = useState("Student");
  const [subject, setSubject] = useState("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [alerts, setAlerts] = useState<
  {
    type: "danger" | "success" | "neutral";
    title: string;
    detail: string;
  }[]
>([]);

  useEffect(() => {
    async function loadStudent() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const currentRole = profile?.role ?? "student";
      setRole(currentRole);

      let student: Student | null = null;

      if (currentRole === "parent") {
        const { data: link } = await supabase
          .from("parent_students")
          .select("student_id")
          .eq("parent_user_id", user.id)
          .maybeSingle();

        if (!link?.student_id) {
          setMessage("No student is linked to this parent account yet.");
          setLoading(false);
          return;
        }

        const { data: linkedStudent } = await supabase
          .from("students")
          .select("id, first_name, subject")
          .eq("id", link.student_id)
          .maybeSingle();

        student = linkedStudent;
      } else {
        const { data: ownStudent } = await supabase
          .from("students")
          .select("id, first_name, subject")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        student = ownStudent;
      }

      if (!student) {
        setMessage("No linked student profile found for this account.");
        setLoading(false);
        return;
      }

      setFirstName(student.first_name);
      setSubject(student.subject ?? "");

      const { data: nextLesson } = await supabase
        .from("lessons")
        .select("lesson_date, duration_minutes, zoom_link, status, notes")
        .eq("student_id", student.id)
        .gte("lesson_date", new Date().toISOString())
        .order("lesson_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      const newAlerts: {
  type: "danger" | "success" | "neutral";
  title: string;
  detail: string;
}[] = [];

if (nextLesson) {
  setLesson(nextLesson);

  const lessonDate = new Date(nextLesson.lesson_date);
  const hoursUntil =
    (lessonDate.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntil >= 0 && hoursUntil <= 24) {
    newAlerts.push({
      type: "danger",
      title: "lesson soon",
      detail:
        hoursUntil < 1
          ? "Your lesson starts in less than 1 hour."
          : `Your lesson starts in ${Math.ceil(hoursUntil)} hours.`,
    });
  }
}

const now = Date.now();
const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000;
const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

const { data: dueAssignments } = await supabase
  .from("assignments")
  .select("id, title, due_date")
  .eq("student_id", student.id)
  .is("archived_at", null)
  .is("trashed_at", null)
  .not("due_date", "is", null)
  .gte("due_date", new Date(now).toISOString())
  .lte("due_date", new Date(threeDaysFromNow).toISOString())
  .order("due_date", { ascending: true })
  .limit(2);

if (dueAssignments && dueAssignments.length > 0) {
  dueAssignments.forEach((assignment) => {
    newAlerts.push({
      type: "danger",
      title: "assignment due soon",
      detail: `${assignment.title ?? "Assignment"} is almost due.`,
    });
  });
}

const { data: recentFeedback } = await supabase
  .from("submissions")
  .select("id, ai_feedback, tutor_feedback, created_at")
  .eq("student_id", student.id)
  .is("archived_at", null)
  .is("trashed_at", null)
  .gte("created_at", new Date(sevenDaysAgo).toISOString())
  .or("ai_feedback.not.is.null,tutor_feedback.not.is.null")
  .order("created_at", { ascending: false })
  .limit(1);

if (recentFeedback && recentFeedback.length > 0) {
  newAlerts.push({
    type: "success",
    title: "feedback received",
    detail: "New feedback has been posted.",
  });
}

setAlerts(newAlerts);

      setLoading(false);
    }

    loadStudent();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const buttons = [
    ["assignments", "/student/assignments"],
    ["submissions", "/student/submissions"],
    ["feedback", "/student/feedback"],
    ["schedule", "/student/schedule"],
    ...(role === "parent" ? [["payments", "/student/payments"]] : []),
  ];

  return (
    <main className="min-h-screen bg-[#080808] text-[#e8e8e8]">
  <DotBackground />
      <style>{`
  @keyframes blink {
    50% { border-color: transparent; }
  }

  .typing-dashboard {
    display: inline-block;
    overflow: hidden;
    white-space: nowrap;
    border-right: 3px solid #e8e8e8;
    max-width: 0;
    animation:
      blink 0.8s step-end infinite;
  }
`}</style>


      <section className="relative mx-auto max-w-[1100px] py-24 pl-28 pr-8">
        <StudentAlertRail alerts={alerts} />
        <div className="flex items-center justify-between">
          <p className="text-[13px] uppercase tracking-[0.32em] text-[#777]">
            • {role === "parent" ? "Parent Dashboard" : "Student Dashboard"}
          </p>

          <button
            onClick={logout}
            className="text-[13px] tracking-[0.22em] text-[#777] hover:text-white"
          >
            logout
          </button>
        </div>

        {loading ? (
          <p className="mt-16 text-[#888]">Loading...</p>
        ) : message ? (
          <div className="mt-16 max-w-[650px] border border-white/10 bg-white/[0.02] p-6">
            <p className="text-[#888]">{message}</p>
          </div>
        ) : (
          <>
            <h1
  className="typing-dashboard mt-10 text-[56px] font-semibold tracking-[-0.04em]"
  style={{
    animation: `
      typing-${firstName.length} 2s steps(${firstName.length + 10}, end) forwards,
      blink 0.8s step-end infinite
    `,
  }}
>
  <style>{`
    @keyframes typing-${firstName.length} {
      from { max-width: 0; }
      to { max-width: ${firstName.length + 10}ch; }
    }
  `}</style>
  welcome, {firstName}.
</h1>

            {subject && (
              <p className="mt-6 text-[17px] leading-8 text-[#888]">
                Current course: {subject}
              </p>
            )}

            {lesson && (
              <div className="mt-12 max-w-[650px] border border-white/10 bg-white/[0.02] p-6">
                <p className="text-[13px] uppercase tracking-[0.32em] text-[#777]">
                  next lesson
                </p>

                <p className="mt-4 text-[24px] text-white/90">
  {formatVancouverDate(lesson.lesson_date)}
</p>

                {lesson.notes && (
                  <p className="mt-3 text-[15px] text-[#888]">
                    {lesson.notes}
                  </p>
                )}

                {lesson.zoom_link && (
                  <a
                    href={lesson.zoom_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-block border border-white/10 px-5 py-3 text-[13px] uppercase tracking-[0.22em] text-white/75 hover:border-white/30 hover:text-white"
                  >
                    join lesson
                  </a>
                )}
              </div>
            )}

            <div className="mt-16 flex max-w-[900px] flex-wrap gap-4">
              {buttons.map(([title, href]) => (
                <PortalButton href={href} key={title}>
                  {title}
                </PortalButton>
              ))}
            </div>
          </>
        )}
      </section>

      <footer className="absolute bottom-0 left-0 right-0 border-t border-[#ffffff10] py-5">
        <div className="mx-auto max-w-[1100px] px-8 text-[12px] tracking-[0.15em] text-[#666]">
          © Copyright Clement & Leo 2026
        </div>
      </footer>
    </main>
  );
}