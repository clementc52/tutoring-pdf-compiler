import type { Metadata } from "next";
import { Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const portalFont = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Student Portal",
  description: "Student portal for assignments, lessons, and payments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
  suppressHydrationWarning
  className={`${portalFont.className} min-h-full flex flex-col`}
>
        {children}
      </body>
    </html>
  );
}
