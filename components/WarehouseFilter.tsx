'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Warehouse as WarehouseIcon } from 'lucide-react';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

export function WarehouseFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(
    searchParams.get('warehouse') || ''
  );

  useEffect(() => {
    fetch('/api/warehouses')
      .then((res) => res.json())
      .then((data) => {
        // Ensure data is an array
        if (Array.isArray(data)) {
          setWarehouses(data);
        } else {
          setWarehouses([]);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch warehouses:', error);
        setWarehouses([]);
      });
  }, []);

  const handleChange = (warehouseId: string) => {
    setSelectedWarehouse(warehouseId);
    const params = new URLSearchParams(searchParams.toString());
    if (warehouseId) {
      params.set('warehouse', warehouseId);
    } else {
      params.delete('warehouse');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    router.push(newUrl);
  };

  return (
    <div className="flex items-center gap-2">
      <WarehouseIcon className="w-4 h-4 text-gray-400" />
      <select
        value={selectedWarehouse}
        onChange={(e) => handleChange(e.target.value)}
        className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Warehouses</option>
        {Array.isArray(warehouses) && warehouses.map((wh) => (
          <option key={wh._id} value={wh._id}>
            {wh.name} ({wh.code})
          </option>
        ))}
      </select>
    </div>
  );
}

