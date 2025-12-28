import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IndoSense - Management System",
  description: "IndoSense internal team management system",
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
