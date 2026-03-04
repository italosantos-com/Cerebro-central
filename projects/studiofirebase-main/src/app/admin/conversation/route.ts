/**
 * Route handler for /admin/conversation
 * Redirects to /admin/conversations (plural)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function GET(request: NextRequest) {
  // Redirect to the plural /admin/conversations route
  return NextResponse.redirect(new URL('/admin/conversations', request.url), {
    status: 301, // Permanent redirect
  });
}
