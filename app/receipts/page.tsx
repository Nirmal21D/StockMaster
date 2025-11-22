'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Eye, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

interface Receipt {
  _id: string;
  receiptNumber: string;
  supplierName?: string;
  warehouseId: any;
  status: string;
  createdAt: string;
  createdBy: any;
}

export default function ReceiptsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showImportSuccess, setShowImportSuccess] = useState(false);

  const userRole = (session?.user as any)?.role;
  const canCreate = ['ADMIN', 'OPERATOR'].includes(userRole);

  // Check for import success message
  useEffect(() => {
    const importSuccess = searchParams?.get('import_success');
    
    if (importSuccess === 'true') {
      setShowImportSuccess(true);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowImportSuccess(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchReceipts();
  }, [search]);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const url = search ? `/api/receipts?search=${encodeURIComponent(search)}` : '/api/receipts';
      const res = await fetch(url);
      const data = await res.json();
      
      // Check if the response is an array (success) or has an error property
      if (Array.isArray(data)) {
        setReceipts(data);
      } else if (data && data.error) {
        console.error('API Error:', data.error);
        setReceipts([]);
      } else {
        setReceipts([]);
      }
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'WAITING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Import Success Message */}
      {showImportSuccess && (
        <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div className="flex-1">
            <h3 className="text-green-400 font-medium">Import Successful!</h3>
            <p className="text-gray-300 text-sm">
              Receipts imported successfully.
              {searchParams?.get('created') && ` ${searchParams.get('created')} created.`}
              {searchParams?.get('updated') && ` ${searchParams.get('updated')} updated.`}
            </p>
          </div>
          <button
            onClick={() => setShowImportSuccess(false)}
            className="text-green-400 hover:text-green-300"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Receipts</h1>
        {canCreate && (
          <Link
            href="/receipts/new-enhanced"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Receipts
          </Link>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search receipts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading receipts...</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Schedule Date
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
              {Array.isArray(receipts) && receipts.map((receipt) => (
                <tr key={receipt._id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {receipt.receiptNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {receipt.supplierName || 'vendor'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {receipt.warehouseId?.code || receipt.warehouseId?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {receipt.supplierName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {formatDate(receipt.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                        receipt.status
                      )}`}
                    >
                      {receipt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/receipts/${receipt._id}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!Array.isArray(receipts) || receipts.length === 0) && (
            <div className="text-center py-12 text-gray-400">No receipts found</div>
          )}
        </div>
      )}
    </div>
  );
}

