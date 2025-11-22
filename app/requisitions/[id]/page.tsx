'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface Requisition {
  _id: string;
  requisitionNumber: string;
  requestingWarehouseId: any;
  suggestedSourceWarehouseId?: any;
  finalSourceWarehouseId?: any;
  status: string;
  lines: any[];
  createdAt: string;
  createdBy: any;
  approvedBy?: any;
  rejectedReason?: string;
  approvedAt?: string;
}

export default function RequisitionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const requisitionId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [finalSourceWarehouse, setFinalSourceWarehouse] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [warehouses, setWarehouses] = useState<any[]>([]);

  useEffect(() => {
    fetchRequisition();
    fetchWarehouses();
  }, [requisitionId]);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouses');
      const data = await res.json();
      setWarehouses(data || []);
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
    }
  };

  const fetchRequisition = async () => {
    try {
      const response = await fetch(`/api/requisitions/${requisitionId}`);
      if (!response.ok) throw new Error('Failed to fetch requisition');
      const data = await response.json();
      setRequisition(data);
      setFinalSourceWarehouse(data.finalSourceWarehouseId?._id || data.suggestedSourceWarehouseId?._id || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (action: 'submit' | 'approve' | 'reject') => {
    setProcessing(true);
    setError('');

    try {
      const body: any = { action };
      if (action === 'approve' && finalSourceWarehouse) {
        body.finalSourceWarehouseId = finalSourceWarehouse;
      }
      if (action === 'reject') {
        body.reason = rejectReason || 'Rejected by manager';
      }

      const response = await fetch(`/api/requisitions/${requisitionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} requisition`);
      }

      setShowApproveDialog(false);
      setShowRejectDialog(false);
      router.push('/requisitions');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
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

  const userRole = (session?.user as any)?.role;
  const canSubmit = ['ADMIN', 'OPERATOR'].includes(userRole) && requisition?.status === 'DRAFT';
  const canApprove = ['ADMIN', 'MANAGER'].includes(userRole) && requisition?.status === 'SUBMITTED';
  const canReject = ['ADMIN', 'MANAGER'].includes(userRole) && requisition?.status === 'SUBMITTED';
  const canCreateTransfer = ['ADMIN', 'MANAGER'].includes(userRole) && requisition?.status === 'APPROVED';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading requisition...</div>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
          {error || 'Requisition not found'}
        </div>
        <Link href="/requisitions" className="text-primary hover:text-primary/80 transition-colors">
          ← Back to Requisitions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/requisitions"
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Requisition</h1>
            <p className="text-muted-foreground mt-1">{requisition.requisitionNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(
              requisition.status
            )}`}
          >
            {requisition.status}
          </span>
          {canSubmit && (
            <button
              onClick={() => handleSubmit('submit')}
              disabled={processing}
              className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Submit
            </button>
          )}
          {canApprove && (
            <button
              onClick={() => setShowApproveDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          )}
          {canReject && (
            <button
              onClick={() => setShowRejectDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          )}
          {canCreateTransfer && (
            <Link
              href={`/transfers/new?requisitionId=${requisitionId}`}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4" />
              Create Transfer
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
          {error}
        </div>
      )}

      <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 space-y-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Requesting Warehouse
            </label>
            <p className="text-foreground">
              {requisition.requestingWarehouseId?.name} ({requisition.requestingWarehouseId?.code})
            </p>
          </div>

          {requisition.suggestedSourceWarehouseId && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Suggested Source
              </label>
              <p className="text-foreground">
                {requisition.suggestedSourceWarehouseId?.name} ({requisition.suggestedSourceWarehouseId?.code})
              </p>
            </div>
          )}

          {requisition.finalSourceWarehouseId && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Final Source
              </label>
              <p className="text-foreground">
                {requisition.finalSourceWarehouseId?.name} ({requisition.finalSourceWarehouseId?.code})
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Created By
            </label>
            <p className="text-foreground">{requisition.createdBy?.name || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Created At
            </label>
            <p className="text-foreground">{formatDate(requisition.createdAt)}</p>
          </div>

          {requisition.approvedBy && (
            <>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Approved By
                </label>
                <p className="text-foreground">{requisition.approvedBy?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Approved At
                </label>
                <p className="text-foreground">{formatDate(requisition.approvedAt!)}</p>
              </div>
            </>
          )}

          {requisition.rejectedReason && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Rejection Reason
              </label>
              <p className="text-destructive">{requisition.rejectedReason}</p>
            </div>
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    Quantity Requested
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Needed By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {requisition.lines?.map((line: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-foreground">
                      [{line.productId?.sku}] {line.productId?.name}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {line.quantityRequested} {line.productId?.unit}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.neededByDate ? formatDate(line.neededByDate) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Approve Dialog */}
      {showApproveDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-4">Approve Requisition</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Final Source Warehouse
                </label>
                <select
                  value={finalSourceWarehouse}
                  onChange={(e) => setFinalSourceWarehouse(e.target.value)}
                  className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowApproveDialog(false)}
                  className="px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit('approve')}
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-muted text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {processing ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-4">Reject Requisition</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reason
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Enter rejection reason"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRejectDialog(false)}
                  className="px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit('reject')}
                  disabled={processing || !rejectReason}
                  className="px-4 py-2 bg-destructive hover:bg-destructive/90 disabled:bg-muted text-destructive-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {processing ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

