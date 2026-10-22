/**
 * Development-only access guard for API routes.
 * 
 * In production, all report-related API endpoints are blocked to prevent
 * unauthorized access. Phase 4 will implement the approved production access mechanism.
 * 
 * This is a TEMPORARY Phase 1.1 safeguard, not the final production security model.
 */

import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = [
  '/api/report',
  '/api/reports',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(protectedPath => 
    pathname === protectedPath || pathname.startsWith(protectedPath + '/')
  );
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Middleware-style guard for API routes.
 * Returns a NextResponse with 403 if access should be denied, null if allowed.
 */
export function developmentOnlyGuard(request: NextRequest): NextResponse<{ error: string }> | null {
  const pathname = request.nextUrl.pathname;
  
  // Skip if not a protected path
  if (!isProtectedPath(pathname)) {
    return null;
  }
  
  // Allow in development mode
  if (isDevelopment()) {
    return null;
  }
  
  // Block in production
  return NextResponse.json(
    { 
      error: 'Report API access restricted. Production access requires approved security mechanism (Phase 4).' 
    },
    { status: 403 }
  );
}

/**
 * Higher-order function to wrap API route handlers with development-only guard.
 * Supports both simple handlers (request only) and dynamic route handlers (request, { params }).
 */
export function withDevelopmentGuard<
  T extends (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse>
>(handler: T): T {
  return (async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const guardResponse = developmentOnlyGuard(request);
    if (guardResponse) {
      return guardResponse;
    }
    return handler(request, context);
  }) as T;
}

/**
 * Wrapper for simple API handlers that don't use dynamic params.
 */
export function withDevelopmentGuardSimple<
  T extends (request: NextRequest) => Promise<NextResponse>
>(handler: T): T {
  return (async (request: NextRequest) => {
    const guardResponse = developmentOnlyGuard(request);
    if (guardResponse) {
      return guardResponse;
    }
    return handler(request);
  }) as T;
}