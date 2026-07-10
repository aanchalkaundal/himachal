import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "News Video Generator",
  description: "Deterministic, template-driven professional news videos. No AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
