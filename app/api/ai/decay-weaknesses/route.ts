import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function POST() {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: weaknesses, error } = await supabaseAdmin
      .from("student_weakness_profiles")
      .select("*")
      .lt("last_seen", oneWeekAgo.toISOString())
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    for (const weakness of weaknesses || []) {
      const newScore = Math.max((weakness.weakness_score ?? 1) - 1, 0);

      await supabaseAdmin
        .from("student_weakness_profiles")
        .update({
          weakness_score: newScore,
          is_active: newScore > 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", weakness.id);
    }

    return NextResponse.json({
      message: "Weakness decay completed.",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}