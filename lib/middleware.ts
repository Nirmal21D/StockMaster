import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import mongoose from 'mongoose';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'MANAGER';

export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is active
  const userStatus = (session.user as any)?.status;
  if (userStatus !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Account is not active. Please contact administrator.' },
      { status: 403 }
    );
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

/**
 * Get warehouse filter for Operators - they can only see their assigned warehouses
 * Returns array of warehouse IDs or null (null means no filter - all warehouses)
 */
export function getWarehouseFilter(session: any): mongoose.Types.ObjectId[] | null {
  const userRole = (session.user as any)?.role;
  const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
  
  // Operators can only see their assigned warehouses
  if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
    return assignedWarehouses.map((id: string) => new mongoose.Types.ObjectId(id));
  }
  
  // Admin and Manager can see all warehouses (no filter)
  return null;
}

/**
 * Check if user has access to a specific warehouse
 */
export function hasWarehouseAccess(session: any, warehouseId: string | mongoose.Types.ObjectId): boolean {
  const userRole = (session.user as any)?.role;
  const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
  
  // Admin and Manager have access to all warehouses
  if (userRole === 'ADMIN' || userRole === 'MANAGER') {
    return true;
  }
  
  // Operators can only access their assigned warehouses
  const warehouseIdStr = warehouseId.toString();
  return assignedWarehouses.includes(warehouseIdStr);
}

