'use client';

import { useState, useEffect } from 'react';
import { Warehouse, MapPin } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
  address?: string;
}

interface Location {
  _id: string;
  name: string;
  code?: string;
  warehouseId: any;
}

export default function SettingsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [warehousesRes, locationsRes] = await Promise.all([
        fetch('/api/warehouses'),
        fetch('/api/locations'),
      ]);
      const warehousesData = await warehousesRes.json();
      const locationsData = await locationsRes.json();
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
      setLocations(Array.isArray(locationsData) ? locationsData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const userRole = (session?.user as any)?.role;
  const canManage = userRole === 'ADMIN';

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link
          href="/settings/warehouses"
          className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center gap-3 mb-4">
            <Warehouse className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Warehouses</h2>
          </div>
          <p className="text-gray-400">
            {canManage ? 'Manage warehouses and their details' : 'View warehouses (read-only)'}
          </p>
        </Link>

        <Link
          href="/settings/locations"
          className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-green-500 transition-colors"
        >
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-semibold text-white">Locations</h2>
          </div>
          <p className="text-gray-400">
            {canManage ? 'Manage locations within warehouses' : 'View locations (read-only)'}
          </p>
        </Link>
      </div>

      {!canManage && (
        <div className="p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-400">
          You are viewing settings in read-only mode. Only administrators can create, edit, or delete warehouses and locations.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Warehouse className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Warehouses</h2>
          </div>
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-2">
              {warehouses.map((warehouse) => (
                <div
                  key={warehouse._id}
                  className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="font-medium text-white">{warehouse.name}</div>
                  <div className="text-sm text-gray-400">Code: {warehouse.code}</div>
                  {warehouse.address && (
                    <div className="text-sm text-gray-500 mt-1">{warehouse.address}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-semibold text-white">Locations</h2>
          </div>
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-2">
              {locations.map((location) => (
                <div
                  key={location._id}
                  className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="font-medium text-white">{location.name}</div>
                  <div className="text-sm text-gray-400">
                    Warehouse: {location.warehouseId?.name || '-'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

