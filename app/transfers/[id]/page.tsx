'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Printer } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface Transfer {
  _id: string;
  transferNumber: string;
  requisitionId?: any;
  deliveryId?: any;
  sourceWarehouseId: any;
  targetWarehouseId: any;
  status: string;
  lines: any[];
  createdAt: string;
  createdBy: any;
  validatedBy?: any;
  dispatchedAt?: string;
  receivedAt?: string;
}

export default function TransferDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const transferId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [transfer, setTransfer] = useState<Transfer | null>(null);

  useEffect(() => {
    fetchTransfer();
  }, [transferId]);

  const fetchTransfer = async () => {
    try {
      const response = await fetch(`/api/transfers/${transferId}`);
      if (!response.ok) throw new Error('Failed to fetch transfer');
      const data = await response.json();
      setTransfer(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!confirm('Are you sure you want to dispatch this transfer? This will decrement stock from the source warehouse.')) {
      return;
    }

    setValidating(true);
    setError('');

    try {
      const response = await fetch(`/api/transfers/${transferId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to dispatch transfer');
      }

      fetchTransfer();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleAccept = async () => {
    if (!confirm('Are you sure you want to mark this transfer as received? This will increment stock at your warehouse and complete the transfer.')) {
      return;
    }

    setValidating(true);
    setError('');

    try {
      const response = await fetch(`/api/transfers/${transferId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark transfer as received');
      }

      fetchTransfer();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'IN_TRANSIT':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const userRole = (session?.user as any)?.role;
  const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];
  
  // Admin or Operator at source warehouse can dispatch
  const canDispatch = (() => {
    if (!session || !transfer || loading) return false;
    if (!['ADMIN', 'OPERATOR'].includes(userRole || '')) return false;
    if (transfer.status !== 'DRAFT') return false;
    
    // Admin can dispatch from any warehouse
    if (userRole === 'ADMIN') return true;
    
    // Operator must be from source warehouse
    if (!transfer.sourceWarehouseId) return false;
    const sourceWarehouseIdObj = transfer.sourceWarehouseId;
    const sourceWarehouseId = (sourceWarehouseIdObj as any)?._id || sourceWarehouseIdObj;
    const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
    
    return assignedWarehouses.some((whId: any) => {
      const whIdStr = whId?.toString ? whId.toString() : String(whId);
      return whIdStr === sourceWarehouseIdStr;
    });
  })();
  
  // Admin or Operator at target warehouse can receive
  const canAccept = (() => {
    if (!session || !transfer || loading) return false;
    if (!['ADMIN', 'OPERATOR'].includes(userRole || '')) return false;
    if (transfer.status !== 'IN_TRANSIT') return false;
    
    // Admin can receive at any warehouse
    if (userRole === 'ADMIN') return true;
    
    // Operator must be from target warehouse
    if (!transfer.targetWarehouseId) return false;
    const targetWarehouseIdObj = transfer.targetWarehouseId;
    const targetWarehouseId = (targetWarehouseIdObj as any)?._id || targetWarehouseIdObj;
    const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
    
    return assignedWarehouses.some((whId: any) => {
      const whIdStr = whId?.toString ? whId.toString() : String(whId);
      return whIdStr === targetWarehouseIdStr;
    });
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading transfer...</div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error || 'Transfer not found'}
        </div>
        <Link href="/transfers" className="text-blue-400 hover:text-blue-300">
          ← Back to Transfers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/transfers"
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Transfer</h1>
            <p className="text-gray-400 mt-1">{transfer.transferNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(
              transfer.status
            )}`}
          >
            {transfer.status}
          </span>
          {canDispatch && (
            <button
              onClick={handleDispatch}
              disabled={validating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              {validating ? 'Dispatching...' : 'Dispatch'}
            </button>
          )}
          {canAccept && (
            <button
              onClick={handleAccept}
              disabled={validating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              {validating ? 'Marking as Received...' : 'Mark as Received'}
            </button>
          )}
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {transfer.requisitionId && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Requisition
              </label>
              <Link
                href={`/requisitions/${transfer.requisitionId._id || transfer.requisitionId}`}
                className="text-blue-400 hover:text-blue-300"
              >
                {transfer.requisitionId?.requisitionNumber || transfer.requisitionId}
              </Link>
            </div>
          )}

          {transfer.deliveryId && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Delivery
              </label>
              <Link
                href={`/deliveries/${transfer.deliveryId._id || transfer.deliveryId}`}
                className="text-blue-400 hover:text-blue-300"
              >
                {transfer.deliveryId?.deliveryNumber || transfer.deliveryId}
              </Link>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Source Warehouse
            </label>
            <p className="text-white">
              {transfer.sourceWarehouseId?.name} ({transfer.sourceWarehouseId?.code})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Target Warehouse
            </label>
            <p className="text-white">
              {transfer.targetWarehouseId?.name} ({transfer.targetWarehouseId?.code})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Created By
            </label>
            <p className="text-white">{transfer.createdBy?.name || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Created At
            </label>
            <p className="text-white">{formatDate(transfer.createdAt)}</p>
          </div>

          {transfer.dispatchedAt && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Dispatched At
              </label>
              <p className="text-white">{formatDate(transfer.dispatchedAt)}</p>
            </div>
          )}

          {transfer.validatedBy && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Accepted By
                </label>
                <p className="text-white">{transfer.validatedBy?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Received At
                </label>
                <p className="text-white">{formatDate(transfer.receivedAt!)}</p>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-800 pt-6">
          <h2 className="text-lg font-semibold text-white mb-4">Products</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Source Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Target Location
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {transfer.lines?.map((line: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-white">
                      [{line.productId?.sku}] {line.productId?.name}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {line.sourceLocationId?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {line.targetLocationId?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {line.quantity} {line.productId?.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

