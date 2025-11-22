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
        <div className="text-gray-400">Loading delivery...</div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error || 'Delivery not found'}
        </div>
        <Link href="/deliveries" className="text-blue-400 hover:text-blue-300">
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
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Delivery</h1>
            <p className="text-gray-400 mt-1">{delivery.deliveryNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Draft</span>
            <span className="text-gray-600">→</span>
            <span className="text-sm text-gray-400">Waiting</span>
            <span className="text-gray-600">→</span>
            <span className="text-sm text-gray-400">Ready</span>
            <span className="text-gray-600">→</span>
            <span className="text-sm text-gray-400">Done</span>
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
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              {validating ? 'Validating...' : 'Validate'}
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
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Customer Name
            </label>
            <p className="text-white">{delivery.customerName || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Warehouse
            </label>
            <p className="text-white">
              {delivery.warehouseId?.name} ({delivery.warehouseId?.code})
            </p>
          </div>

          {delivery.deliveryAddress && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Delivery Address
              </label>
              <p className="text-white">{delivery.deliveryAddress}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Reference
            </label>
            <p className="text-white">{delivery.reference || '-'}</p>
          </div>

          {delivery.scheduleDate && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Schedule Date
              </label>
              <p className="text-white">{formatDate(delivery.scheduleDate)}</p>
            </div>
          )}

          {delivery.responsible && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Responsible
              </label>
              <p className="text-white">{delivery.responsible}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Created By
            </label>
            <p className="text-white">{delivery.createdBy?.name || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Created At
            </label>
            <p className="text-white">{formatDate(delivery.createdAt)}</p>
          </div>

          {delivery.validatedBy && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Validated By
                </label>
                <p className="text-white">{delivery.validatedBy?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Validated At
                </label>
                <p className="text-white">{formatDate(delivery.validatedAt!)}</p>
              </div>
            </>
          )}

          {delivery.notes && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Notes
              </label>
              <p className="text-white">{delivery.notes}</p>
            </div>
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
                    From Location
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {delivery.lines?.map((line: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-white">
                      [{line.productId?.sku}] {line.productId?.name}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {line.fromLocationId?.name || '-'}
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

