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
  sourceWarehouseId: any;
  targetWarehouseId: any;
  status: string;
  lines: any[];
  createdAt: string;
  createdBy: any;
  validatedBy?: any;
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

  const handleValidate = async () => {
    if (!confirm('Are you sure you want to validate this transfer? This will move stock between warehouses.')) {
      return;
    }

    setValidating(true);
    setError('');

    try {
      const response = await fetch(`/api/transfers/${transferId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to validate transfer');
      }

      router.push('/transfers');
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
  const canValidate = ['ADMIN', 'MANAGER'].includes(userRole) && transfer?.status !== 'DONE';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading transfer...</div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
          {error || 'Transfer not found'}
        </div>
        <Link href="/transfers" className="text-primary hover:text-primary/80 transition-colors">
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
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transfer</h1>
            <p className="text-muted-foreground mt-1">{transfer.transferNumber}</p>
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
          {canValidate && (
            <button
              onClick={handleValidate}
              disabled={validating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-muted disabled:cursor-not-allowed text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <CheckCircle className="w-4 h-4" />
              {validating ? 'Validating...' : 'Validate'}
            </button>
          )}
          <button className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-all duration-300">
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
          {error}
        </div>
      )}

      <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 space-y-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {transfer.requisitionId && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Requisition
              </label>
              <p className="text-foreground">{transfer.requisitionId?.requisitionNumber || '-'}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Source Warehouse
            </label>
            <p className="text-foreground">
              {transfer.sourceWarehouseId?.name} ({transfer.sourceWarehouseId?.code})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Target Warehouse
            </label>
            <p className="text-foreground">
              {transfer.targetWarehouseId?.name} ({transfer.targetWarehouseId?.code})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Created By
            </label>
            <p className="text-foreground">{transfer.createdBy?.name || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Created At
            </label>
            <p className="text-foreground">{formatDate(transfer.createdAt)}</p>
          </div>

          {transfer.validatedBy && (
            <>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Validated By
                </label>
                <p className="text-foreground">{transfer.validatedBy?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Received At
                </label>
                <p className="text-foreground">{formatDate(transfer.receivedAt!)}</p>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-black/10 dark:border-white/10 pt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Products</h2>
          <div className="bg-muted/30 rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Source Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Target Location
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {transfer.lines?.map((line: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-foreground">
                      [{line.productId?.sku}] {line.productId?.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.sourceLocationId?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.targetLocationId?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
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

