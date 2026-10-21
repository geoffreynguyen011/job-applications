import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const key = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  let loggedIn = false;

  if (token) {
    try {
      await jwtVerify(token, key, { algorithms: ["HS256"] });
      loggedIn = true;
    } catch {}
  }

  if (!loggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

// export const config = {
//   matcher: ["/dashboard/:path*"],
// };

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/users/:path*",
    "/applications/:path*",
    "/job-postings/:path*",
    "/settings/:path*",
    "/create-company",
  ],
};