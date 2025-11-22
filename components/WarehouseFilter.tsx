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
      <WarehouseIcon className="w-4 h-4 text-muted-foreground" />
      <select
        value={selectedWarehouse}
        onChange={(e) => handleChange(e.target.value)}
        className="px-3 py-2 bg-background border border-black/10 dark:border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 hover:bg-muted/50"
        style={{
          backgroundImage: 'none'
        }}
      >
        <option value="" className="bg-background text-foreground">All Warehouses</option>
        {Array.isArray(warehouses) && warehouses.map((wh) => (
          <option key={wh._id} value={wh._id} className="bg-background text-foreground">
            {wh.name} ({wh.code})
          </option>
        ))}
      </select>
    </div>
  );
}

