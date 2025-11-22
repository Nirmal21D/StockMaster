'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Users, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { isAdmin } from '@/lib/authRoles';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
  address?: string;
  description?: string;
  isActive: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | null;
  assignedWarehouses: string[];
}

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const warehouseId = params.id as string;
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);

  const userRole = (session?.user as any)?.role;
  const canManage = isAdmin(userRole);

  useEffect(() => {
    if (warehouseId) {
      fetchWarehouse();
      fetchAssignedUsers();
      if (canManage) {
        fetchAllUsers();
      }
    }
  }, [warehouseId, canManage]);

  const fetchWarehouse = async () => {
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}`);
      if (!res.ok) throw new Error('Failed to fetch warehouse');
      const data = await res.json();
      setWarehouse(data);
    } catch (error) {
      console.error('Failed to fetch warehouse:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) return;
      const users = await res.json();
      // Filter users assigned to this warehouse
      const assigned = (users || []).filter((user: User) =>
        user.assignedWarehouses?.includes(warehouseId)
      );
      setAssignedUsers(assigned);
    } catch (error) {
      console.error('Failed to fetch assigned users:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) return;
      const users = await res.json();
      // Filter to only MANAGER and OPERATOR roles
      const managersAndOperators = (users || []).filter(
        (user: User) => user.role === 'MANAGER' || user.role === 'OPERATOR'
      );
      setAllUsers(managersAndOperators);
    } catch (error) {
      console.error('Failed to fetch all users:', error);
    }
  };

  const handleAddUser = async (userId: string) => {
    try {
      const user = allUsers.find((u) => u._id === userId);
      if (!user) return;

      const currentWarehouses = user.assignedWarehouses || [];
      if (currentWarehouses.includes(warehouseId)) {
        alert('User is already assigned to this warehouse');
        return;
      }

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedWarehouses: [...currentWarehouses, warehouseId],
        }),
      });

      if (!res.ok) throw new Error('Failed to assign user');
      fetchAssignedUsers();
      setShowAddUser(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from this warehouse?')) return;

    try {
      const user = assignedUsers.find((u) => u._id === userId);
      if (!user) return;

      const currentWarehouses = user.assignedWarehouses || [];
      const updatedWarehouses = currentWarehouses.filter((id) => id !== warehouseId);

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedWarehouses: updatedWarehouses,
          primaryWarehouseId:
            user.assignedWarehouses?.[0] === warehouseId ? null : user.assignedWarehouses?.[0],
        }),
      });

      if (!res.ok) throw new Error('Failed to remove user');
      fetchAssignedUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading warehouse...</div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          Warehouse not found
        </div>
        <Link href="/settings/warehouses" className="text-blue-400 hover:text-blue-300">
          ← Back to Warehouses
        </Link>
      </div>
    );
  }

  const availableUsers = allUsers.filter(
    (user) => !assignedUsers.some((au) => au._id === user._id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/settings/warehouses"
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{warehouse.name}</h1>
            <p className="text-gray-400 mt-1">Code: {warehouse.code}</p>
          </div>
        </div>
        {canManage && (
          <Link
            href={`/settings/warehouses?edit=${warehouseId}`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Warehouse
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Warehouse Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
              <p className="text-white">{warehouse.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Code</label>
              <p className="text-white">{warehouse.code}</p>
            </div>
            {warehouse.address && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Address</label>
                <p className="text-white">{warehouse.address}</p>
              </div>
            )}
            {warehouse.description && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <p className="text-white">{warehouse.description}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  warehouse.isActive
                    ? 'bg-green-500/20 text-green-400 border-green-500/50'
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                }`}
              >
                {warehouse.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Assigned Workers
              </h2>
              {availableUsers.length > 0 && (
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Worker
                </button>
              )}
            </div>

            {showAddUser && availableUsers.length > 0 && (
              <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddUser(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue=""
                >
                  <option value="">Select user to assign...</option>
                  {availableUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="mt-2 text-sm text-gray-400 hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}

            {assignedUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No workers assigned</p>
                {availableUsers.length === 0 && (
                  <p className="text-xs mt-2 text-gray-500">
                    No available users to assign (all MANAGER/OPERATOR users are already assigned)
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {assignedUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                      <span
                        className={`mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                          user.role === 'MANAGER'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(user._id)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                      title="Remove from warehouse"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

