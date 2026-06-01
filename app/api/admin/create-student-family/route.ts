import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      studentName,
      studentEmail,
      studentPassword,
      parentName,
      parentEmail,
      parentPassword,
      grade,
      school,
      subject,
    } = body;

    if (!studentName || !studentEmail || !studentPassword) {
      return NextResponse.json(
        { error: "Student name, email, and password are required." },
        { status: 400 }
      );
    }

    if (!parentName || !parentEmail || !parentPassword) {
      return NextResponse.json(
        { error: "Parent name, email, and password are required." },
        { status: 400 }
      );
    }

    const parsedStudentName = splitName(studentName);
    const parsedParentName = splitName(parentName);

    const { data: studentAuth, error: studentAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email: studentEmail,
        password: studentPassword,
        email_confirm: true,
      });

    if (studentAuthError || !studentAuth.user) {
      return NextResponse.json(
        { error: studentAuthError?.message ?? "Could not create student user." },
        { status: 500 }
      );
    }

    const { data: parentAuth, error: parentAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email: parentEmail,
        password: parentPassword,
        email_confirm: true,
      });

    if (parentAuthError || !parentAuth.user) {
      return NextResponse.json(
        { error: parentAuthError?.message ?? "Could not create parent user." },
        { status: 500 }
      );
    }

    const studentUserId = studentAuth.user.id;
    const parentUserId = parentAuth.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert([
  {
    id: studentUserId,
    role: "student",
    display_name: studentName,
    email: studentEmail,
  },
  {
    id: parentUserId,
    role: "parent",
    display_name: parentName,
    email: parentEmail,
  },
]);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { data: insertedStudent, error: studentInsertError } =
      await supabaseAdmin
        .from("students")
        .insert({
          auth_user_id: studentUserId,
          email: studentEmail,
          first_name: parsedStudentName.firstName,
          last_name: parsedStudentName.lastName,
          grade: grade || null,
          school: school || null,
          subject: subject || null,
        })
        .select("id")
        .single();

    if (studentInsertError || !insertedStudent) {
      return NextResponse.json(
        { error: studentInsertError?.message ?? "Could not create student row." },
        { status: 500 }
      );
    }

    const { error: linkError } = await supabaseAdmin
      .from("parent_students")
      .insert({
        parent_user_id: parentUserId,
        student_id: insertedStudent.id,
      });

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Student and parent accounts created.",
      student_user_id: studentUserId,
      parent_user_id: parentUserId,
      student_id: insertedStudent.id,
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        error: String(err),
      },
      {
        status: 500,
      }
    );
  }
}