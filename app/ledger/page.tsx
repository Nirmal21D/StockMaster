'use client';

import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface StockMovement {
  _id: string;
  productId: any;
  warehouseFromId?: any;
  warehouseToId?: any;
  locationFromId?: any;
  locationToId?: any;
  change: number;
  type: string;
  createdAt: string;
  createdBy: any;
}

export default function LedgerPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ledger');
      const data = await res.json();
      setMovements(Array.isArray(data.movements) ? data.movements : Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch movements:', error);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return 'text-green-400';
      case 'DELIVERY':
        return 'text-red-400';
      case 'TRANSFER':
        return 'text-blue-400';
      case 'ADJUSTMENT':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Move History</h1>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search movements..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading movements...</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {movements.map((movement) => (
                <tr
                  key={movement._id}
                  className={`hover:bg-gray-800/50 ${
                    movement.type === 'RECEIPT' ? 'bg-green-500/5' : ''
                  } ${movement.type === 'DELIVERY' ? 'bg-red-500/5' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(movement.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {movement.productId?.name || movement.productId?.sku || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {movement.warehouseFromId?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {movement.warehouseToId?.name || '-'}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getTypeColor(
                      movement.type
                    )}`}
                  >
                    {movement.change > 0 ? '+' : ''}
                    {movement.change}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full border ${getTypeColor(
                        movement.type
                      )} border-current/30`}
                    >
                      {movement.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {movement.createdBy?.name || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {movements.length === 0 && (
            <div className="text-center py-12 text-gray-400">No movements found</div>
          )}
        </div>
      )}
    </div>
  );
}

