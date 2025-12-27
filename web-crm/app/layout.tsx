import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team CRM - Management System",
  description: "Internal team management CRM system",
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
