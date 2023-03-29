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
      {/* Favicons! */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={metadata.description} />
        <link rel="icon" href="/favicon.png" />
      </head>

      <body>{props.children}</body>
      <Analytics />
    </html>
  );
}
