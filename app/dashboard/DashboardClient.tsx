'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Package, AlertTriangle, FileText, Truck, Clock, TrendingDown, Settings, Users, Warehouse } from 'lucide-react';
import Link from 'next/link';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

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
  description?: string;
  trend?: { value: number; label: string };
}

function KPICard({ title, value, icon, href, description, trend }: KPICardProps) {
  const content = (
    <div className="p-6 rounded-xl border border-black/10 dark:border-white/10 bg-card/50 backdrop-blur-xl hover:shadow-xl transition-all duration-300 cursor-pointer shadow-lg group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-muted-foreground/70 group-hover:text-foreground/70 transition-colors">
              {icon}
            </div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-end justify-between mt-4">
        <div className="text-4xl font-bold text-foreground">{value}</div>
        {trend && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground/60">{trend.label}</div>
            <div className={`text-sm font-semibold ${trend.value > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
              {trend.value > 0 ? '+' : ''}{trend.value}
            </div>
          </div>
        )}
      </div>
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
        <div className="text-center text-muted-foreground py-4">Loading dashboard data...</div>
      )}

      {userRole === 'MANAGER' && managerWarehouse && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center gap-3 backdrop-blur-sm">
          <Package className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground font-medium">Your Center</p>
            <p className="text-lg text-foreground font-semibold">{managerWarehouse.name} ({managerWarehouse.code})</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Total SKUs"
          value={data.totalSKUs}
          icon={<Package className="w-6 h-6" />}
          description="Active products in inventory"
        />
        <KPICard
          title="Low Stock Items"
          value={data.lowStockCount}
          icon={<AlertTriangle className="w-6 h-6" />}
          href="/products?filter=low-stock"
          description="Products below reorder point"
          trend={{ value: data.lowStockCount, label: 'Requires attention' }}
        />
        <KPICard
          title="Pending Requisitions"
          value={data.pendingRequisitions}
          icon={<FileText className="w-6 h-6" />}
          href="/requisitions?status=SUBMITTED"
          description="Awaiting approval or fulfillment"
        />
        <KPICard
          title="Pending Transfers"
          value={data.pendingTransfers}
          icon={<Truck className="w-6 h-6" />}
          href="/transfers?status=DRAFT"
          description="In-transit between warehouses"
        />
        <KPICard
          title="Slow/Dead Stock"
          value={data.slowDeadStockCount}
          icon={<Clock className="w-6 h-6" />}
          href="/products"
          description="No movement in 90+ days"
          trend={{ value: data.slowDeadStockCount, label: 'Total items' }}
        />
        <KPICard
          title="Stockout Events (30d)"
          value={data.stockoutEvents}
          icon={<TrendingDown className="w-6 h-6" />}
          description="Zero-stock occurrences last month"
        />
      </div>

      {/* Role-specific Quick Links */}
      <div className="mt-8 bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userRole === 'ADMIN' && (
            <>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">Manage Users</div>
                  <div className="text-sm text-muted-foreground">Approve and manage user accounts</div>
                </div>
              </Link>
              <Link
                href="/settings/warehouses"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Warehouse className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">Manage Warehouses</div>
                  <div className="text-sm text-muted-foreground">Create and configure warehouses</div>
                </div>
              </Link>
              <Link
                href="/products/new"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">Add Product</div>
                  <div className="text-sm text-muted-foreground">Create new product master data</div>
                </div>
              </Link>
            </>
          )}
          
          {userRole === 'MANAGER' && (
            <>
              <Link
                href="/requisitions?status=SUBMITTED"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">Approve Requisitions</div>
                  <div className="text-sm text-muted-foreground">Review and approve stock requests</div>
                </div>
              </Link>
              <Link
                href="/transfers?status=DRAFT"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Truck className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">Validate Transfers</div>
                  <div className="text-sm text-muted-foreground">Validate inter-warehouse transfers</div>
                </div>
              </Link>
              <Link
                href="/products/new"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">Add Product</div>
                  <div className="text-sm text-muted-foreground">Create new product master data</div>
                </div>
              </Link>
            </>
          )}
          
          {userRole === 'OPERATOR' && (
            <>
              <Link
                href="/receipts/new"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">New Receipt</div>
                  <div className="text-sm text-muted-foreground">Record incoming stock</div>
                </div>
              </Link>
              <Link
                href="/deliveries/new"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Truck className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">New Delivery</div>
                  <div className="text-sm text-muted-foreground">Record outgoing stock</div>
                </div>
              </Link>
              <Link
                href="/requisitions/new"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">New Requisition</div>
                  <div className="text-sm text-muted-foreground">Request stock from other warehouses</div>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

