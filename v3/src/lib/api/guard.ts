/**
 * Production-ready access guard for API routes (Phase 4 / Phase 5).
 * 
 * In development, requests are automatically permitted.
 * In production, requests originating from the portal are validated,
 * cross-site forgery attempts are blocked, and an optional coordinator secret
 * can be enforced via environment variables without requiring a login screen.
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
 * Access guard for API routes.
 * Returns a NextResponse with 403 if access should be denied, null if allowed.
 */
export function developmentOnlyGuard(request: NextRequest): NextResponse<{ error: string }> | null {
  const pathname = request.nextUrl.pathname;
  
  // Skip if not a protected path
  if (!isProtectedPath(pathname)) {
    return null;
  }
  
  // Always allow in development mode
  if (isDevelopment()) {
    return null;
  }

  // Production check 1: Enforce optional coordinator secret if configured
  const coordinatorSecret = process.env.COORDINATOR_ACCESS_SECRET;
  if (coordinatorSecret) {
    const provided = 
      request.headers.get?.('x-coordinator-key') ||
      request.cookies?.get?.('coordinator_key')?.value;
    if (provided !== coordinatorSecret) {
      return NextResponse.json(
        { error: 'Access restricted: Valid coordinator access secret required.' },
        { status: 403 }
      );
    }
  }

  // Production check 2: Block cross-site forged requests to mutation endpoints
  const secFetchSite = request.headers.get?.('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return NextResponse.json(
      { error: 'Access restricted: Cross-site requests are not permitted.' },
      { status: 403 }
    );
  }

  // Allow legitimate coordinator requests
  return null;
}

/**
 * Higher-order function to wrap API route handlers with development/production guard.
 * Supports dynamic route handlers (request, { params }).
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