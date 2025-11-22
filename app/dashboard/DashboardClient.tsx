'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Package, AlertTriangle, FileText, Truck, Clock, TrendingDown } from 'lucide-react';
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
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);

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

      {/* KPI Cards */}
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
          href="/analytics/slow-stock"
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

      {/* Analytics Dashboard */}
      <AnalyticsDashboard warehouseId={warehouseId} />
    </div>
  );
}

