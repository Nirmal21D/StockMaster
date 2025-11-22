'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, Warehouse } from 'lucide-react';
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
  const [managerWarehouse, setManagerWarehouse] = useState<any>(null);
  const [operatorWarehouses, setOperatorWarehouses] = useState<any[]>([]);

  const userRole = (session?.user as any)?.role;
  const primaryWarehouseId = (session?.user as any)?.primaryWarehouseId;
  const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];

  useEffect(() => {
    if (userRole === 'MANAGER') {
      const mainWarehouseId = primaryWarehouseId || (assignedWarehouses.length > 0 ? assignedWarehouses[0] : null);
      if (mainWarehouseId) {
        fetch(`/api/warehouses/${mainWarehouseId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && !data.error) {
              setManagerWarehouse(data);
            }
          })
          .catch((err) => console.error('Failed to fetch warehouse:', err));
      }
    } else if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
      // Fetch all assigned warehouses for operator
      const warehousePromises = assignedWarehouses.map((whId: string) =>
        fetch(`/api/warehouses/${whId}`)
          .then((res) => res.json())
          .then((data) => (data && !data.error ? data : null))
          .catch(() => null)
      );
      
      Promise.all(warehousePromises)
        .then((warehouses) => {
          setOperatorWarehouses(warehouses.filter((wh) => wh !== null));
        })
        .catch((err) => console.error('Failed to fetch warehouses:', err));
    }
  }, [userRole, primaryWarehouseId, assignedWarehouses]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };

  return (
    <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-white">{pageTitle}</h2>
        <WarehouseFilter />
        {userRole === 'MANAGER' && managerWarehouse && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/50 rounded-lg">
            <Warehouse className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-300 font-medium">
              Manager of: {managerWarehouse.name}
            </span>
          </div>
        )}
        {userRole === 'OPERATOR' && operatorWarehouses.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/50 rounded-lg">
            <Warehouse className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-300 font-medium">
              Operator at: {operatorWarehouses.map((wh) => wh.name).join(', ')}
            </span>
          </div>
        )}
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

