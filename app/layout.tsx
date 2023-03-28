import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { headers } from "next/headers";

export const metadata = {
  title: "US Citizenship Practice Exam",
  description: "A study guide for US Naturalization Test, in every language.",
};

export default function RootLayout(props: any) {
  const heads = headers();

  // get the lang from the url in the headers
  const url = heads.values();
  console.log(url);

  console.log("params", url);
  return (
    <html lang="en">
      <body>{props.children}</body>
      <Analytics />
    </html>
  );
}
