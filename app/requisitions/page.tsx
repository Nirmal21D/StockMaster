'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface Requisition {
  _id: string;
  requisitionNumber: string;
  requestingWarehouseId: any;
  status: string;
  createdAt: string;
  createdBy: any;
}

type ViewType = 'all' | 'sent' | 'received';

export default function RequisitionsPage() {
  const { data: session } = useSession();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [allRequisitions, setAllRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>('all');

  useEffect(() => {
    fetchRequisitions();
  }, []);

  useEffect(() => {
    filterRequisitions();
  }, [viewType, allRequisitions, session]);

  const userRole = (session?.user as any)?.role;
  const canCreate = userRole === 'MANAGER';
  const userId = (session?.user as any)?.id;
  const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];
  const primaryWarehouseId = (session?.user as any)?.primaryWarehouseId;
  const managerWarehouseIds = primaryWarehouseId 
    ? [primaryWarehouseId, ...assignedWarehouses]
    : assignedWarehouses;

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requisitions');
      const data = await res.json();
      const reqs = Array.isArray(data) ? data : [];
      setAllRequisitions(reqs);
      setRequisitions(reqs);
    } catch (error) {
      console.error('Failed to fetch requisitions:', error);
      setAllRequisitions([]);
      setRequisitions([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRequisitions = () => {
    if (userRole !== 'MANAGER' || viewType === 'all') {
      setRequisitions(allRequisitions);
      return;
    }

    if (viewType === 'sent') {
      // Requisitions created by this manager
      const sent = allRequisitions.filter((req) => {
        const createdById = req.createdBy?._id || req.createdBy;
        return createdById?.toString() === userId?.toString();
      });
      setRequisitions(sent);
    } else if (viewType === 'received') {
      // Requisitions where this manager can approve (not from their warehouse)
      const received = allRequisitions.filter((req) => {
        const requestingWarehouseId = req.requestingWarehouseId?._id || req.requestingWarehouseId;
        const requestingWarehouseIdStr = requestingWarehouseId?.toString ? requestingWarehouseId.toString() : String(requestingWarehouseId);
        
        // Received = requisitions NOT from this manager's warehouse (they can approve these)
        const isFromMyWarehouse = managerWarehouseIds.some((whId: any) => {
          const whIdStr = whId?.toString ? whId.toString() : String(whId);
          return whIdStr === requestingWarehouseIdStr;
        });
        
        return !isFromMyWarehouse;
      });
      setRequisitions(received);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'REJECTED':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'SUBMITTED':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Requisitions</h1>
        {canCreate && (
          <Link
            href="/requisitions/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Requisition
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
            Sent ({allRequisitions.filter((req) => {
              const createdById = req.createdBy?._id || req.createdBy;
              return createdById?.toString() === userId?.toString();
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
            Received ({allRequisitions.filter((req) => {
              const requestingWarehouseId = req.requestingWarehouseId?._id || req.requestingWarehouseId;
              const requestingWarehouseIdStr = requestingWarehouseId?.toString ? requestingWarehouseId.toString() : String(requestingWarehouseId);
              const isFromMyWarehouse = managerWarehouseIds.some((whId: any) => {
                const whIdStr = whId?.toString ? whId.toString() : String(whId);
                return whIdStr === requestingWarehouseIdStr;
              });
              return !isFromMyWarehouse;
            }).length})
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading requisitions...</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Requesting Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {requisitions.map((req) => (
                <tr key={req._id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    <div className="flex items-center gap-2">
                      {req.requisitionNumber}
                      {(req.status === 'APPROVED' || req.status === 'REJECTED') && (
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(
                            req.status
                          )}`}
                        >
                          {req.status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {req.requestingWarehouseId?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                        req.status
                      )}`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {formatDate(req.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/requisitions/${req._id}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requisitions.length === 0 && (
            <div className="text-center py-12 text-gray-400">No requisitions found</div>
          )}
        </div>
      )}
    </div>
  );
}

