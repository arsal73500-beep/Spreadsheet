import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backlink Manager - Google Sheets-Style GitHub Backlink Tracker",
  description:
    "Production-grade backlink management spreadsheet backed by persistent GitHub storage for MD Health Center, AINT Foundation, and Dr Irshad Malik.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen w-screen flex flex-col antialiased select-none overflow-hidden">
        {children}
      </body>
    </html>
  );
}
