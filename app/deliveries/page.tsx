'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface Delivery {
  _id: string;
  deliveryNumber: string;
  warehouseId: any; // Source warehouse
  targetWarehouseId?: any; // Target warehouse
  status: string;
  createdAt: string;
  createdBy: any;
}

type ViewType = 'all' | 'sent' | 'received';

export default function DeliveriesPage() {
  const { data: session } = useSession();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [allDeliveries, setAllDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewType, setViewType] = useState<ViewType>('all');

  const userRole = (session?.user as any)?.role;
  const canCreate = userRole === 'MANAGER'; // Only Managers can create deliveries
  const userId = (session?.user as any)?.id;
  const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];
  const primaryWarehouseId = (session?.user as any)?.primaryWarehouseId;
  const managerWarehouseIds = primaryWarehouseId 
    ? [primaryWarehouseId, ...assignedWarehouses]
    : assignedWarehouses;

  useEffect(() => {
    fetchDeliveries();
  }, [search]);

  useEffect(() => {
    filterDeliveries();
  }, [viewType, allDeliveries, session]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const url = search
        ? `/api/deliveries?search=${encodeURIComponent(search)}`
        : '/api/deliveries';
      const res = await fetch(url);
      const data = await res.json();
      const dels = Array.isArray(data) ? data : [];
      setAllDeliveries(dels);
      setDeliveries(dels);
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
      setAllDeliveries([]);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  const filterDeliveries = () => {
    if (userRole !== 'MANAGER' || viewType === 'all') {
      setDeliveries(allDeliveries);
      return;
    }

    if (viewType === 'sent') {
      // Deliveries where this manager's warehouse is the source (warehouseId)
      const sent = allDeliveries.filter((del) => {
        const sourceWarehouseId = del.warehouseId?._id || del.warehouseId;
        const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
        
        const isFromMyWarehouse = managerWarehouseIds.some((whId: any) => {
          const whIdStr = whId?.toString ? whId.toString() : String(whId);
          return whIdStr === sourceWarehouseIdStr;
        });
        
        return isFromMyWarehouse;
      });
      setDeliveries(sent);
    } else if (viewType === 'received') {
      // Deliveries where this manager's warehouse is the target (targetWarehouseId)
      const received = allDeliveries.filter((del) => {
        const targetWarehouseId = del.targetWarehouseId?._id || del.targetWarehouseId;
        if (!targetWarehouseId) return false;
        
        const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
        
        const isToMyWarehouse = managerWarehouseIds.some((whId: any) => {
          const whIdStr = whId?.toString ? whId.toString() : String(whId);
          return whIdStr === targetWarehouseIdStr;
        });
        
        return isToMyWarehouse;
      });
      setDeliveries(received);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'READY':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'WAITING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'REJECTED':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Deliveries</h1>
        {canCreate && (
          <Link
            href="/deliveries/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Delivery
          </Link>
        )}
      </div>

      {/* Tabs for Managers */}
      {userRole === 'MANAGER' && (
        <div className="flex gap-2 border-b border-gray-800">
          <button
            onClick={() => setViewType('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewType === 'all'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setViewType('sent')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewType === 'sent'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Sent ({allDeliveries.filter((del) => {
              const sourceWarehouseId = del.warehouseId?._id || del.warehouseId;
              const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
              return managerWarehouseIds.some((whId: any) => {
                const whIdStr = whId?.toString ? whId.toString() : String(whId);
                return whIdStr === sourceWarehouseIdStr;
              });
            }).length})
          </button>
          <button
            onClick={() => setViewType('received')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewType === 'received'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Received ({allDeliveries.filter((del) => {
              const targetWarehouseId = del.targetWarehouseId?._id || del.targetWarehouseId;
              if (!targetWarehouseId) return false;
              const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
              return managerWarehouseIds.some((whId: any) => {
                const whIdStr = whId?.toString ? whId.toString() : String(whId);
                return whIdStr === targetWarehouseIdStr;
              });
            }).length})
          </button>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search deliveries by reference or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading deliveries...</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  From Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  To Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {deliveries.map((delivery) => (
                <tr key={delivery._id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {delivery.deliveryNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {delivery.warehouseId?.name || delivery.warehouseId?.code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {delivery.targetWarehouseId?.name || delivery.targetWarehouseId?.code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {formatDate(delivery.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                        delivery.status
                      )}`}
                    >
                      {delivery.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/deliveries/${delivery._id}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deliveries.length === 0 && (
            <div className="text-center py-12 text-gray-400">No deliveries found</div>
          )}
        </div>
      )}
    </div>
  );
}

