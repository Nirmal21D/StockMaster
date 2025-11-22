'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

interface Location {
  _id: string;
  name: string;
}

interface StockLevel {
  quantity: number;
}

export default function NewAdjustmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingStock, setFetchingStock] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [formData, setFormData] = useState({
    productId: '',
    warehouseId: '',
    locationId: '',
    newQuantity: '',
    reason: 'COUNT_ERROR',
    remarks: '',
  });
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.warehouseId) {
      fetchLocations(formData.warehouseId);
    }
  }, [formData.warehouseId]);

  useEffect(() => {
    if (formData.productId && formData.warehouseId) {
      fetchCurrentStock();
    } else {
      setCurrentStock(null);
    }
  }, [formData.productId, formData.warehouseId, formData.locationId]);

  const fetchData = async () => {
    try {
      const [productsRes, warehousesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/warehouses'),
      ]);
      const productsData = await productsRes.json();
      const warehousesData = await warehousesRes.json();
      setProducts(productsData.products || []);
      setWarehouses(warehousesData || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const fetchLocations = async (warehouseId: string) => {
    try {
      const res = await fetch(`/api/locations?warehouseId=${warehouseId}`);
      const data = await res.json();
      setLocations(data || []);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const fetchCurrentStock = async () => {
    setFetchingStock(true);
    try {
      const res = await fetch(
        `/api/stock?productId=${formData.productId}&warehouseId=${formData.warehouseId}&locationId=${formData.locationId || ''}`
      );
      if (res.ok) {
        const data = await res.json();
        setCurrentStock(data.quantity || 0);
        if (!formData.newQuantity) {
          setFormData({ ...formData, newQuantity: (data.quantity || 0).toString() });
        }
      }
    } catch (err) {
      console.error('Failed to fetch stock:', err);
      setCurrentStock(0);
    } finally {
      setFetchingStock(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.productId || !formData.warehouseId || !formData.newQuantity) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: formData.productId,
          warehouseId: formData.warehouseId,
          locationId: formData.locationId || undefined,
          newQuantity: parseInt(formData.newQuantity),
          reason: formData.reason,
          remarks: formData.remarks || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create adjustment');
      }

      router.push('/adjustments');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const difference = currentStock !== null && formData.newQuantity
    ? parseInt(formData.newQuantity) - currentStock
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/adjustments"
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <h1 className="text-3xl font-bold text-white">New Stock Adjustment</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product *
            </label>
            <select
              required
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value, newQuantity: '' })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  [{product.sku}] {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Warehouse *
            </label>
            <select
              required
              value={formData.warehouseId}
              onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value, locationId: '', newQuantity: '' })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Location
            </label>
            <select
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value, newQuantity: '' })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!formData.warehouseId}
            >
              <option value="">No location (warehouse level)</option>
              {locations.map((location) => (
                <option key={location._id} value={location._id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Stock
            </label>
            <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
              {fetchingStock ? (
                <Loader2 className="w-4 h-4 animate-spin inline" />
              ) : currentStock !== null ? (
                currentStock
              ) : (
                'Select product and warehouse'
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Quantity *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.newQuantity}
              onChange={(e) => setFormData({ ...formData, newQuantity: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new quantity"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Difference
            </label>
            <div
              className={`px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg font-medium ${
                difference > 0
                  ? 'text-green-400'
                  : difference < 0
                  ? 'text-red-400'
                  : 'text-gray-400'
              }`}
            >
              {difference > 0 ? '+' : ''}
              {difference}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason *
            </label>
            <select
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="COUNT_ERROR">Count Error</option>
              <option value="DAMAGE">Damage</option>
              <option value="LOSS">Loss</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Remarks
            </label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional remarks"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-800">
          <Link
            href="/adjustments"
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Adjustment'}
          </button>
        </div>
      </form>
    </div>
  );
}

