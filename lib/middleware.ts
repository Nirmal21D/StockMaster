import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'MANAGER';

export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return session;
}

export async function requireRole(request: NextRequest, allowedRoles: UserRole[]) {
  const session = await requireAuth(request);

  if (session instanceof NextResponse) {
    return session;
  }

  const userRole = (session.user as any)?.role as UserRole;

  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }

  return session;
}

export function checkRole(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

