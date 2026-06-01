import AppSidebar from "@/components/AppSidebar";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppSidebar role="student" />
      {children}
    </>
  );
}