"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Payment = {
  id: string;
  amount: number | null;
  payment_date: string | null;
  status: string | null;
  notes: string | null;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    async function loadPayments() {
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

      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", student.id)
        .order("payment_date", { ascending: false });

      setPayments(data || []);
    }

    loadPayments();
  }, []);

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
          payments.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Payment records and lesson package history.
        </p>

        <div className="mt-16 space-y-6">
          {payments.length === 0 && (
            <div className="border border-[#ffffff18] p-8 text-[#777]">
              No payment records yet.
            </div>
          )}

          {payments.map((payment) => (
            <div
              key={payment.id}
              className="border border-[#ffffff18] bg-[#ffffff03] p-8"
            >
              <h2 className="text-[24px] uppercase tracking-[0.12em]">
                ${payment.amount ?? 0}
              </h2>

              {payment.payment_date && (
                <p className="mt-4 text-[#777]">
                  Date: Date: {formatVancouverDate(payment.payment_date)}
                </p>
              )}

              <p className="mt-4">
                Status:{" "}
                <span className="text-white">
                  {payment.status ?? "pending"}
                </span>
              </p>

              {payment.notes && (
                <p className="mt-4 text-[#888]">
                  {payment.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}