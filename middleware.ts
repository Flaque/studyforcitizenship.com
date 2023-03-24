import { NextRequest, NextResponse } from "next/server";

// only run middleware on home page
export const config = {
  // Match everything in vercel
  matcher: "/(.*)",
};

export default function middleware(req: NextRequest) {
  // If we're on a `/:lang/study/*` page
  if (req.nextUrl.pathname.includes("/study")) {
    console.log(req.geo);

    // add req.geo.region to the query
    if (req.geo?.region) {
      req.nextUrl.searchParams.set("region", req.geo?.region);
      return NextResponse.next();
    }

    return NextResponse.next();
  }

  // Only continue if we're on the `/` page
  if (req.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  const acceptLanguage = req.headers.get("accept-language");

  if (!acceptLanguage) {
    return NextResponse.rewrite(req.nextUrl);
  }

  const locale = acceptLanguage?.split(",")?.[0] || "en-US";

  // strip the -US from the locale
  const localeWithoutCountry = locale.split("-")[0];

  // Rewrite the path (`/`) to the localized page (pages/[locale]/[country])
  req.nextUrl.pathname = `/${localeWithoutCountry}/study`;
  return NextResponse.redirect(req.nextUrl);
}
