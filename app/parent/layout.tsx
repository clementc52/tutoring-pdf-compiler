import AppSidebar from "@/components/AppSidebar";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppSidebar role="parent" />
      {children}
    </>
  );
}