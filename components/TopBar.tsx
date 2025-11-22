'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { WarehouseFilter } from './WarehouseFilter';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/receipts': 'Receipts',
  '/deliveries': 'Deliveries',
  '/requisitions': 'Requisitions',
  '/transfers': 'Transfers',
  '/adjustments': 'Adjustments',
  '/ledger': 'Move History',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname === path || pathname?.startsWith(path + '/')) {
      return title;
    }
  }
  return 'StockMaster';
}

export function TopBar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname || '');

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };

  return (
    <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-white">{pageTitle}</h2>
        <WarehouseFilter />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">
            {(session?.user as any)?.role || 'USER'}
          </span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

