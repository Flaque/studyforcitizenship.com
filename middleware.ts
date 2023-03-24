import { NextRequest, NextResponse } from "next/server";

// only run middleware on home page
export const config = {
  matcher: "/",
};

export default function middleware(req: NextRequest) {
  const country = req.geo?.country?.toLowerCase() || "us";

  const acceptLanguage = req.headers.get("accept-language");

  if (!acceptLanguage) {
    return NextResponse.rewrite(req.nextUrl);
  }

  const locale = acceptLanguage?.split(",")?.[0] || "en-US";
  console.log("argle bargle?", locale);

  // strip the -US from the locale
  const localeWithoutCountry = locale.split("-")[0];

  // Rewrite the path (`/`) to the localized page (pages/[locale]/[country])
  req.nextUrl.pathname = `/${localeWithoutCountry}/study`;
  return NextResponse.rewrite(req.nextUrl);
}
