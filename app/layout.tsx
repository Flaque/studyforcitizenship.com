import { Analytics } from "@vercel/analytics/react";

import "./globals.css";

export const metadata = {
  title: "US Citizenship Practice Exam",
  description: "A study guide for US Naturalization Test, in every language.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
      <Analytics />
    </html>
  );
}
