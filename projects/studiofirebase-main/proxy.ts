import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

type SessionPayload = {
  uid: string;
  email: string;
  role?: string;
};

type AdminRouteInfo = {
  isAdminRoute: boolean;
  isSlugged: boolean;
  slug: string | null;
  internalPath: string;
};

const ADMIN_PUBLIC_PATHS = new Set<string>([
  '/admin/login',
  '/admin/register',
  '/admin/forgot-password',
  '/admin/reset-password',
  '/admin/verify-email',
  '/admin/email-changed',
  '/admin/mfa-enabled',
]);

function isAdminPublicPath(path: string): boolean {
  return ADMIN_PUBLIC_PATHS.has(path);
}

function parseAdminRoute(path: string): AdminRouteInfo {
  if (path.startsWith('/admin')) {
    return {
      isAdminRoute: true,
      isSlugged: false,
      slug: null,
      internalPath: path,
    };
  }

  const sluggedAdminMatch = path.match(/^\/([^/]+)\/admin(\/.*)?$/);
  if (!sluggedAdminMatch) {
    return {
      isAdminRoute: false,
      isSlugged: false,
      slug: null,
      internalPath: path,
    };
  }

  const slug = sluggedAdminMatch[1] || null;
  const rest = sluggedAdminMatch[2] || '';
  const reservedFirstSegment = new Set(['api', '_next']);

  if (slug && reservedFirstSegment.has(slug)) {
    return {
      isAdminRoute: false,
      isSlugged: false,
      slug: null,
      internalPath: path,
    };
  }

  return {
    isAdminRoute: true,
    isSlugged: true,
    slug,
    internalPath: `/admin${rest}`,
  };
}

function applyAdminSlugCookie(response: NextResponse, slug: string | null) {
  if (!slug) return response;
  response.cookies.set('admin_slug', slug, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
  });
  return response;
}

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) {
    return new TextEncoder().encode(secret);
  }

  return new TextEncoder().encode("dev-only-jwt-secret-change-me-1234567890");
}

async function verifySessionCookie(token?: string): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    const role = typeof payload.role === "string" ? payload.role.toLowerCase() : "user";
    return {
      uid: String(payload.uid || ""),
      email: String(payload.email || ""),
      role,
    };
  } catch {
    return null;
  }
}

export default withAuth(
  async function proxy(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const adminRoute = parseAdminRoute(path);
    const userRole = token?.role;
    const sessionToken = req.cookies.get("session")?.value;
    const session = await verifySessionCookie(sessionToken);

    if (adminRoute.isAdminRoute) {
      if (isAdminPublicPath(adminRoute.internalPath)) {
        if (adminRoute.isSlugged) {
          const rewriteUrl = new URL(adminRoute.internalPath, req.url);
          return applyAdminSlugCookie(NextResponse.rewrite(rewriteUrl), adminRoute.slug);
        }
        return NextResponse.next();
      }

      const hasValidAdminSession = Boolean(session?.uid) && session?.role === "admin";
      if (!hasValidAdminSession) {
        const loginPath = adminRoute.isSlugged && adminRoute.slug
          ? `/${adminRoute.slug}/admin/login`
          : "/admin/login";
        const redirect = NextResponse.redirect(new URL(loginPath, req.url));
        return applyAdminSlugCookie(redirect, adminRoute.slug);
      }

      if (adminRoute.isSlugged) {
        const rewriteUrl = new URL(adminRoute.internalPath, req.url);
        return applyAdminSlugCookie(NextResponse.rewrite(rewriteUrl), adminRoute.slug);
      }

      return NextResponse.next();
    }

    if (path.startsWith("/dashboard") && !session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Proteção das rotas de Seller
    if (path.startsWith("/seller") && userRole !== "SELLER" && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;
        const adminRoute = parseAdminRoute(path);
        if (adminRoute.isAdminRoute) return true;

        if (path.startsWith("/dashboard")) {
          const sessionToken = req.cookies.get("session")?.value;
          return Boolean(sessionToken || token);
        }

        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/:username/admin", "/:username/admin/:path*", "/seller/:path*", "/dashboard/:path*"],
};
