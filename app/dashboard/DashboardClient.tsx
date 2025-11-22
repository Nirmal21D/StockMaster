'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Package, AlertTriangle, FileText, Truck, Clock, TrendingDown, Settings, Users, Warehouse } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  totalSKUs: number;
  lowStockCount: number;
  pendingRequisitions: number;
  pendingTransfers: number;
  slowDeadStockCount: number;
  stockoutEvents: number;
}

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
  color: string;
}

function KPICard({ title, value, icon, href, color }: KPICardProps) {
  const content = (
    <div className={`p-6 rounded-xl border ${color} bg-gray-900/50 backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <div className="text-gray-500">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [managerWarehouse, setManagerWarehouse] = useState<any>(null);
  
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
    }
  }, [userRole, primaryWarehouseId, assignedWarehouses]);

  // Get warehouse ID from URL params - memoized to prevent unnecessary re-renders
  const warehouseId = useMemo(() => {
    return searchParams.get('warehouse') || '';
  }, [searchParams]);

  // Fetch dashboard data only when warehouseId changes
  useEffect(() => {
    // If no warehouse selected, use initial data
    if (!warehouseId) {
      setData(initialData);
      return;
    }

    // Fetch data for selected warehouse
    let cancelled = false;
    setLoading(true);

    fetch(`/api/dashboard?warehouseId=${warehouseId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        return res.json();
      })
      .then((newData) => {
        if (!cancelled) {
          setData(newData);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Dashboard fetch error:', error);
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [warehouseId, initialData]);

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-center text-gray-400 py-4">Loading dashboard data...</div>
      )}

      {userRole === 'MANAGER' && managerWarehouse && (
        <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 flex items-center gap-3">
          <Package className="w-5 h-5 text-blue-400" />
          <div>
            <p className="text-sm text-blue-300 font-medium">Your Center</p>
            <p className="text-lg text-white font-semibold">{managerWarehouse.name} ({managerWarehouse.code})</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Total SKUs"
          value={data.totalSKUs}
          icon={<Package className="w-6 h-6" />}
          color="border-blue-500/50"
        />
        <KPICard
          title="Low Stock Items"
          value={data.lowStockCount}
          icon={<AlertTriangle className="w-6 h-6" />}
          href="/products?filter=low-stock"
          color="border-red-500/50"
        />
        <KPICard
          title="Pending Requisitions"
          value={data.pendingRequisitions}
          icon={<FileText className="w-6 h-6" />}
          href="/requisitions?status=SUBMITTED"
          color="border-yellow-500/50"
        />
        <KPICard
          title="Pending Transfers"
          value={data.pendingTransfers}
          icon={<Truck className="w-6 h-6" />}
          href="/transfers?status=DRAFT"
          color="border-purple-500/50"
        />
        <KPICard
          title="Slow/Dead Stock"
          value={data.slowDeadStockCount}
          icon={<Clock className="w-6 h-6" />}
          href="/analytics/slow-stock"
          color="border-orange-500/50"
        />
        <KPICard
          title="Stockout Events (30d)"
          value={data.stockoutEvents}
          icon={<TrendingDown className="w-6 h-6" />}
          color="border-pink-500/50"
        />
      </div>

      {/* Role-specific Quick Links */}
      <div className="mt-8 bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userRole === 'ADMIN' && (
            <>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Users className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-white font-medium">Manage Users</div>
                  <div className="text-sm text-gray-400">Approve and manage user accounts</div>
                </div>
              </Link>
              <Link
                href="/settings/warehouses"
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Warehouse className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-white font-medium">Manage Warehouses</div>
                  <div className="text-sm text-gray-400">Create and configure warehouses</div>
                </div>
              </Link>
              <Link
                href="/products/new"
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Package className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-white font-medium">Add Product</div>
                  <div className="text-sm text-gray-400">Create new product master data</div>
                </div>
              </Link>
            </>
          )}
          
          {userRole === 'MANAGER' && (
            <>
              <Link
                href="/requisitions?status=SUBMITTED"
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="text-white font-medium">Approve Requisitions</div>
                  <div className="text-sm text-gray-400">Review and approve stock requests</div>
                </div>
              </Link>
              <Link
                href="/transfers?status=DRAFT"
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Truck className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="text-white font-medium">Validate Transfers</div>
                  <div className="text-sm text-gray-400">Validate inter-warehouse transfers</div>
                </div>
              </Link>
              <Link
                href="/products/new"
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Package className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-white font-medium">Add Product</div>
                  <div className="text-sm text-gray-400">Create new product master data</div>
                </div>
              </Link>
            </>
          )}
          
          {userRole === 'OPERATOR' && (
            <>
              <Link
                href="/receipts/new"
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Package className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-white font-medium">New Receipt</div>
                  <div className="text-sm text-gray-400">Record incoming stock</div>
                </div>
              </Link>
              <Link
                href="/deliveries/new"
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Truck className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-white font-medium">New Delivery</div>
                  <div className="text-sm text-gray-400">Record outgoing stock</div>
                </div>
              </Link>
              <Link
                href="/requisitions/new"
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="text-white font-medium">New Requisition</div>
                  <div className="text-sm text-gray-400">Request stock from other warehouses</div>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

