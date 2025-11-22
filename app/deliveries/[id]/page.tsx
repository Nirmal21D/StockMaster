'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Printer } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface Delivery {
  _id: string;
  deliveryNumber: string;
  customerName?: string;
  deliveryAddress?: string;
  warehouseId: any;
  status: string;
  reference?: string;
  notes?: string;
  lines: any[];
  createdAt: string;
  createdBy: any;
  validatedBy?: any;
  scheduleDate?: string;
  responsible?: string;
  validatedAt?: string;
}

export default function DeliveryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const deliveryId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [delivery, setDelivery] = useState<Delivery | null>(null);

  useEffect(() => {
    fetchDelivery();
  }, [deliveryId]);

  const fetchDelivery = async () => {
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}`);
      if (!response.ok) throw new Error('Failed to fetch delivery');
      const data = await response.json();
      setDelivery(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!confirm('Are you sure you want to validate this delivery? This will decrement stock levels.')) {
      return;
    }

    setValidating(true);
    setError('');

    try {
      const response = await fetch(`/api/deliveries/${deliveryId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to validate delivery');
      }

      router.push('/deliveries');
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
      case 'READY':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'WAITING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const userRole = (session?.user as any)?.role;
  const canValidate = ['ADMIN', 'OPERATOR'].includes(userRole) && delivery?.status !== 'DONE';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading delivery...</div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
          {error || 'Delivery not found'}
        </div>
        <Link href="/deliveries" className="text-primary hover:text-primary/80 transition-colors">
          ← Back to Deliveries
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/deliveries"
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Delivery</h1>
            <p className="text-muted-foreground mt-1">{delivery.deliveryNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Draft</span>
            <span className="text-muted-foreground/50">→</span>
            <span className="text-sm text-muted-foreground">Waiting</span>
            <span className="text-muted-foreground/50">→</span>
            <span className="text-sm text-muted-foreground">Ready</span>
            <span className="text-muted-foreground/50">→</span>
            <span className="text-sm text-muted-foreground">Done</span>
          </div>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(
              delivery.status
            )}`}
          >
            {delivery.status}
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
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Customer Name
            </label>
            <p className="text-foreground">{delivery.customerName || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Warehouse
            </label>
            <p className="text-foreground">
              {delivery.warehouseId?.name} ({delivery.warehouseId?.code})
            </p>
          </div>

          {delivery.deliveryAddress && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Delivery Address
              </label>
              <p className="text-foreground">{delivery.deliveryAddress}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Reference
            </label>
            <p className="text-foreground">{delivery.reference || '-'}</p>
          </div>

          {delivery.scheduleDate && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Schedule Date
              </label>
              <p className="text-foreground">{formatDate(delivery.scheduleDate)}</p>
            </div>
          )}

          {delivery.responsible && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Responsible
              </label>
              <p className="text-foreground">{delivery.responsible}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Created By
            </label>
            <p className="text-foreground">{delivery.createdBy?.name || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Created At
            </label>
            <p className="text-foreground">{formatDate(delivery.createdAt)}</p>
          </div>

          {delivery.validatedBy && (
            <>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Validated By
                </label>
                <p className="text-foreground">{delivery.validatedBy?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Validated At
                </label>
                <p className="text-foreground">{formatDate(delivery.validatedAt!)}</p>
              </div>
            </>
          )}

          {delivery.notes && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Notes
              </label>
              <p className="text-foreground">{delivery.notes}</p>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    From Location
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {delivery.lines?.map((line: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-foreground">
                      [{line.productId?.sku}] {line.productId?.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.fromLocationId?.name || '-'}
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

