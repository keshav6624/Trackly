import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trackly — Placement Dashboard",
  description: "Placement readiness dashboard using LeetCode and GitHub signals",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
