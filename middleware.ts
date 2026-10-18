import { NextRequest, NextResponse } from "next/server";


function securityHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=()",
  );
  return response;
}

function unauthorized() {
  return securityHeaders(
    new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Basic realm="Ibbo Receipt AI", charset="UTF-8"',
      },
    }),
  );
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

export async function middleware(request: NextRequest) {
  const expectedUsername = process.env.APP_BASIC_AUTH_USERNAME;
  const expectedPasswordHash = process.env.APP_BASIC_AUTH_PASSWORD_SHA256;

  // Deny all requests when credentials are unset or malformed. Never fall
  // back to credentials embedded in source code or a shared default.
  if (
    !expectedUsername?.trim() ||
    !expectedPasswordHash ||
    !/^[a-fA-F0-9]{64}$/.test(expectedPasswordHash)
  ) {
    return unauthorized();
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const credentials = atob(authorization.slice(6));
    const separatorIndex = credentials.indexOf(":");

    if (separatorIndex < 0) {
      return unauthorized();
    }

    const suppliedUsername = credentials.slice(0, separatorIndex);
    const suppliedPassword = credentials.slice(separatorIndex + 1);
    const suppliedPasswordHash = await sha256(suppliedPassword);

    if (
      !constantTimeEqual(suppliedUsername, expectedUsername) ||
      !constantTimeEqual(suppliedPasswordHash, expectedPasswordHash.toLowerCase())
    ) {
      return unauthorized();
    }

    return securityHeaders(NextResponse.next());
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
