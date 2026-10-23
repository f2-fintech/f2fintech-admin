// middleware.ts

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Adjust the path according to your project structure

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("oms_cookie")?.value;

  // Redirect to the login page if not authenticated
  const publicPaths = ["/login", "/img/f2Fintechlogo.png"];

  // Check if the request path is a public path
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname);

  // Check if the user is authenticated
  if (!isPublicPath) {
    if (token) {
      try {
        // Decode token to get the role
        const jwtSecret = new TextEncoder().encode(
          process.env.JWT_SECRET || ""
        );
        const { payload } = await jwtVerify(token, jwtSecret);
        const role = payload.role;

        if (role === "super admin") {
          if (!request.nextUrl.pathname.startsWith("/company") &&
            !request.nextUrl.pathname.startsWith("/user") &&
            !request.nextUrl.pathname.startsWith("/teams") &&
            request.nextUrl.pathname !== "/") {
            return NextResponse.redirect(new URL("/company", request.url));
          }
        }

        // Check if the user is trying to access /loan-provider
        if (request.nextUrl.pathname === "/loan-provider" && role !== "admin") {
          return NextResponse.redirect(new URL("/unauthorised", request.url));
        }

        // Check if the user is trying to access /tickets-archive
        if (request.nextUrl.pathname === "/tickets-archive" && role !== "admin") {
          return NextResponse.redirect(new URL("/unauthorised", request.url));
        }

        // Check if the user is trying to access /secured-loans
        if (request.nextUrl.pathname.startsWith("/secured-loans") && role !== "admin") {
          return NextResponse.redirect(new URL("/unauthorised", request.url));
        }

        // Restrict credit users to only /ticket page
        if (role === "credit") {
          if (!request.nextUrl.pathname.startsWith("/ticket") || request.nextUrl.pathname.startsWith("/ticket/")) {
            return NextResponse.redirect(new URL("/ticket", request.url));
          }
        }

        // Check if the route is restricted for operations and credit
        if ((role === "operations" || role === "sub admin") && request.nextUrl.pathname.startsWith("/user")) {
          // Redirect operations and credit trying to access /user or its subroutes
          return NextResponse.redirect(new URL("/unauthorised", request.url));
        }

        // Check if role is admin or operations and credit
        if (role !== "admin" && role !== "operations" && role !== "credit" && role !== "sales" && role !== "sub admin" && role !== "super admin") {
          return NextResponse.redirect(new URL("/unauthorised", request.url));
        }
        if (role === "sales") {
          // Block sales users from accessing ticket details or subpaths
          if (request.nextUrl.pathname.startsWith("/ticket/")) {
            return NextResponse.redirect(new URL("/ticket", request.url));
          }
          // Default sales access check
          if (!request.nextUrl.pathname.startsWith("/home") && !request.nextUrl.pathname.startsWith("/ticket") && !request.nextUrl.pathname.startsWith("/teams") && !request.nextUrl.pathname.startsWith("/dashboard")) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
          }
        }
      } catch (error) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    } else {
      console.log("redirect to login");
      // Redirect to login if no token is present
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  // Allow the request to proceed if authenticated
  return NextResponse.next();
}

// Specify the paths that this middleware should apply to
export const config = {
  matcher: [
    // Apply to all routes except those specified
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
