'use client';

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, FileText, Truck, Clock, TrendingDown } from 'lucide-react';
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
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updateFromUrl = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const warehouseParam = params.get('warehouse') || '';
      
      if (warehouseParam) {
        setLoading(true);
        fetch(`/api/dashboard?warehouseId=${warehouseParam}`)
          .then((res) => res.json())
          .then((newData) => {
            setData(newData);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      } else {
        setData(initialData);
      }
    };

    updateFromUrl();
    // Listen for URL changes (from WarehouseFilter component)
    window.addEventListener('popstate', updateFromUrl);
    // Also check periodically in case WarehouseFilter updates URL via router.push
    const interval = setInterval(updateFromUrl, 300);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', updateFromUrl);
    };
  }, [initialData]);

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-center text-gray-400 py-4">Loading dashboard data...</div>
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
    </div>
  );
}

