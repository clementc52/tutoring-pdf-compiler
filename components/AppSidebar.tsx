"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarItem = {
  label: string;
  href: string;
  icon: string;
};

const adminItems: SidebarItem[] = [
  { label: "Dashboard", href: "/tutor/dashboard", icon: "⌂" },
  { label: "Students", href: "/tutor/students", icon: "▦" },
  { label: "Students Admin", href: "/tutor/students-admin", icon: "✦" },
  { label: "Lessons", href: "/tutor/lessons", icon: "◷" },
  { label: "Assignments", href: "/tutor/assignments", icon: "□" },
  { label: "Submissions", href: "/tutor/submissions", icon: "⇧" },
  { label: "Homework AI", href: "/tutor/homework-ai", icon: "◇" },
  { label: "Question Bank", href: "/tutor/question-bank", icon: "⌘" },
  { label: "Intelligence", href: "/tutor/student-intelligence", icon: "◎" },
  { label: "Learning", href: "/tutor/learning-dashboard", icon: "◌" },
  { label: "Payments", href: "/tutor/payments", icon: "$" },
  { label: "Settings", href: "/tutor/settings", icon: "⚙" },
];

const studentItems: SidebarItem[] = [
  { label: "Dashboard", href: "/student/dashboard", icon: "⌂" },
  { label: "Assignments", href: "/student/assignments", icon: "□" },
  { label: "Submissions", href: "/student/submissions", icon: "⇧" },
  { label: "Feedback", href: "/student/feedback", icon: "◌" },
  { label: "Schedule", href: "/student/schedule", icon: "◷" },
];

const parentItems: SidebarItem[] = [
  { label: "Dashboard", href: "/student/dashboard", icon: "⌂" },
  { label: "Assignments", href: "/student/assignments", icon: "□" },
  { label: "Submissions", href: "/student/submissions", icon: "⇧" },
  { label: "Feedback", href: "/student/feedback", icon: "◌" },
  { label: "Schedule", href: "/student/schedule", icon: "◷" },
  { label: "Payments", href: "/student/payments", icon: "$" },
];

export default function AppSidebar({ role }: { role: "admin" | "student" | "parent" }) {
  const pathname = usePathname();

  const items =
    role === "admin" ? adminItems : role === "parent" ? parentItems : studentItems;

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[72px] flex-col items-center border-r border-[#ffffff12] bg-[#080808]/95 py-5 backdrop-blur-xl">
      <Link
        href={role === "admin" ? "/tutor/dashboard" : "/student/dashboard"}
        className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl border border-[#ffffff14] text-[18px] text-[#ddd] hover:border-[#ffffff30] hover:text-white"
      >
        N
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={[
                "group relative flex h-11 w-11 items-center justify-center rounded-xl border text-[17px] transition",
                active
                  ? "border-[#ffffff35] bg-[#ffffff10] text-white"
                  : "border-transparent text-[#777] hover:border-[#ffffff20] hover:bg-[#ffffff08] hover:text-white",
              ].join(" ")}
            >
              <span>{item.icon}</span>

              <span className="pointer-events-none absolute left-[54px] top-1/2 hidden -translate-y-1/2 whitespace-nowrap border border-[#ffffff14] bg-[#0c0c0c] px-3 py-2 text-[12px] uppercase tracking-[0.18em] text-[#aaa] shadow-xl group-hover:block">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        title="Logout"
        className="mt-6 flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-[17px] text-[#777] hover:border-[#ffffff20] hover:bg-[#ffffff08] hover:text-white"
      >
        ↩
      </Link>
    </aside>
  );
}