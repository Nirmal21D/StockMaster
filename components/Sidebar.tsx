'use client';

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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/authRoles';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Receipts', href: '/receipts', icon: ArrowDownCircle, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Deliveries', href: '/deliveries', icon: ArrowUpCircle, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Requisitions', href: '/requisitions', icon: FileText, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Transfers', href: '/transfers', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
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
    <div className="w-64 bg-card/40 backdrop-blur-xl border-r border-black/10 dark:border-white/10 min-h-screen flex flex-col">
      <div className="p-6 border-b border-black/10 dark:border-white/10">
        <h1 className="text-2xl font-bold text-foreground">StockMaster</h1>
        <p className="text-sm text-muted-foreground mt-1">Inventory Management</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {visibleNavigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
            {(session?.user?.name?.[0] || 'A').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {(session?.user as any)?.role || 'USER'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

