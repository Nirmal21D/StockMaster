'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  Truck,
  Settings,
  History,
  ClipboardList,
  Users,
  Warehouse,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/authRoles';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const OperatorWarehouseInfo = ({ session }: { session: any }) => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const userRole = (session?.user as any)?.role;
  const primaryWarehouseId = (session?.user as any)?.primaryWarehouseId;
  const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];

  useEffect(() => {
    if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
      const warehousePromises = assignedWarehouses.map((whId: string) =>
        fetch(`/api/warehouses/${whId}`)
          .then((res) => res.json())
          .then((data) => (data && !data.error ? data : null))
          .catch(() => null)
      );
      
      Promise.all(warehousePromises)
        .then((warehouses) => {
          setWarehouses(warehouses.filter((wh) => wh !== null));
        })
        .catch((err) => console.error('Failed to fetch warehouses:', err));
    } else if (userRole === 'MANAGER') {
      const mainWarehouseId = primaryWarehouseId || (assignedWarehouses.length > 0 ? assignedWarehouses[0] : null);
      if (mainWarehouseId) {
        fetch(`/api/warehouses/${mainWarehouseId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && !data.error) {
              setWarehouses([data]);
            }
          })
          .catch((err) => console.error('Failed to fetch warehouse:', err));
      }
    }
  }, [userRole, primaryWarehouseId, assignedWarehouses]);

  if (warehouses.length === 0) return null;

  return (
    <div className="flex items-center gap-1 mt-1">
      <Warehouse className="w-3 h-3 text-gray-500" />
      <p className="text-xs text-gray-500 truncate">
        {warehouses.map((wh) => wh.name).join(', ')}
      </p>
    </div>
  );
};

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Receipts', href: '/receipts', icon: ArrowDownCircle, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Deliveries', href: '/deliveries', icon: ArrowUpCircle, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Requisitions', href: '/requisitions', icon: FileText, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Transfers', href: '/transfers', icon: Truck, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Adjustments', href: '/adjustments', icon: ClipboardList, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Move History', href: '/ledger', icon: History, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Users', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role as Role | undefined;

  // Filter navigation based on user role
  const visibleNavigation = navigation.filter((item) => {
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white">StockMaster</h1>
        <p className="text-sm text-gray-400 mt-1">Inventory Management</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {visibleNavigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            {(session?.user?.name?.[0] || 'A').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {(session?.user as any)?.role || 'USER'}
            </p>
            {((session?.user as any)?.role === 'OPERATOR' || (session?.user as any)?.role === 'MANAGER') && (
              <OperatorWarehouseInfo session={session} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

