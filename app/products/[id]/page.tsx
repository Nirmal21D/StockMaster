'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Package, Warehouse, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { isAdmin } from '@/lib/authRoles';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category?: string;
  unit: string;
  price?: number;
  reorderLevel: number;
  abcClass?: string;
  isActive: boolean;
}

interface StockLevelData {
  productId: string;
  totalQuantity: number;
  byWarehouse: Array<{
    warehouse: any;
    locations: Array<{
      location: any;
      quantity: number;
      updatedAt: string;
    }>;
    total: number;
  }>;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const productId = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [stockLevels, setStockLevels] = useState<StockLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProduct();
    fetchStockLevels();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      const data = await res.json();
      setProduct(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockLevels = async () => {
    try {
      const res = await fetch(`/api/products/${productId}/stock-levels`);
      if (!res.ok) throw new Error('Failed to fetch stock levels');
      const data = await res.json();
      setStockLevels(data);
    } catch (err: any) {
      console.error('Failed to fetch stock levels:', err);
    }
  };

  const userRole = (session?.user as any)?.role;
  const canEdit = userRole === 'ADMIN' || userRole === 'MANAGER';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading product...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error || 'Product not found'}
        </div>
        <Link href="/products" className="text-blue-400 hover:text-blue-300">
          ← Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{product.name}</h1>
            <p className="text-gray-400 mt-1">SKU: {product.sku}</p>
          </div>
        </div>
        {canEdit && (
          <Link
            href={`/products/${productId}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Product Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">SKU</label>
              <p className="text-white">{product.sku}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
              <p className="text-white">{product.category || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Unit</label>
              <p className="text-white">{product.unit}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Price</label>
              <p className="text-white">{product.price ? `₹${product.price}` : '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Reorder Level</label>
              <p className="text-white">{product.reorderLevel} {product.unit}</p>
            </div>
            {product.abcClass && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">ABC Class</label>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/50">
                  {product.abcClass}
                </span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  product.isActive
                    ? 'bg-green-500/20 text-green-400 border-green-500/50'
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                }`}
              >
                {product.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Warehouse className="w-5 h-5" />
            Stock Summary
          </h2>
          {stockLevels && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Total Quantity
                </label>
                <p className="text-2xl font-bold text-white">
                  {stockLevels.totalQuantity} {product.unit}
                </p>
                {stockLevels.totalQuantity < product.reorderLevel && (
                  <p className="text-sm text-red-400 mt-1">
                    ⚠️ Below reorder level ({product.reorderLevel})
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {stockLevels && stockLevels.byWarehouse.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Stock by Warehouse & Location
          </h2>
          <div className="space-y-6">
            {stockLevels.byWarehouse.map((warehouseStock, idx) => (
              <div key={idx} className="border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Warehouse className="w-4 h-4" />
                    {warehouseStock.warehouse?.name} ({warehouseStock.warehouse?.code})
                  </h3>
                  <span className="text-lg font-bold text-white">
                    Total: {warehouseStock.total} {product.unit}
                  </span>
                </div>
                {warehouseStock.locations.length > 0 && (
                  <div className="ml-6 space-y-2">
                    {warehouseStock.locations.map((loc, locIdx) => (
                      <div
                        key={locIdx}
                        className="flex items-center justify-between text-sm text-gray-300"
                      >
                        <span className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {loc.location?.name || 'Default Location'}
                        </span>
                        <span className="font-medium">
                          {loc.quantity} {product.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

