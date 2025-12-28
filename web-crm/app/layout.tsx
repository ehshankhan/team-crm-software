import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IndoSense LMS",
  description: "IndoSense Lab Management System - Manage projects, attendance, inventory, and daily activities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
