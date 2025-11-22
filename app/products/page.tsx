'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, CheckCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category?: string;
  unit: string;
  price?: number;
  reorderLevel: number;
  abcClass?: string;
  totalQuantity?: number;
}

export default function ProductsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showImportSuccess, setShowImportSuccess] = useState(false);

  const userRole = (session?.user as any)?.role;
  const canCreate = userRole === 'ADMIN' || userRole === 'MANAGER';

  // Check for import success message
  useEffect(() => {
    const importSuccess = searchParams?.get('import_success');
    const created = searchParams?.get('created');
    const updated = searchParams?.get('updated');
    
    if (importSuccess === 'true') {
      setShowImportSuccess(true);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowImportSuccess(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const url = search ? `/api/products?search=${encodeURIComponent(search)}` : '/api/products';
      const res = await fetch(url);
      const data = await res.json();
      setProducts(Array.isArray(data.products) ? data.products : Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete product');
      }

      // Refresh the product list
      fetchProducts();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Import Success Message */}
      {showImportSuccess && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center space-x-3 backdrop-blur-sm">
          <CheckCircle className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <h3 className="text-primary font-medium">Import Successful!</h3>
            <p className="text-muted-foreground text-sm">
              Products imported successfully.
              {searchParams?.get('created') && ` ${searchParams.get('created')} created.`}
              {searchParams?.get('updated') && ` ${searchParams.get('updated')} updated.`}
            </p>
          </div>
          <button
            onClick={() => setShowImportSuccess(false)}
            className="text-primary hover:text-primary/80"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Products</h1>
        {canCreate && (
          <Link
            href="/products/new-enhanced"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Add Products
          </Link>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading products...</div>
      ) : (
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-lg">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Reorder Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  ABC Class
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/10">
              {Array.isArray(products) && products.map((product) => (
                <tr key={product._id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {product.category || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {product.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={product.totalQuantity !== undefined && product.totalQuantity < product.reorderLevel ? 'text-destructive' : 'text-foreground'}>
                      {product.totalQuantity !== undefined ? `${product.totalQuantity} ${product.unit}` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {product.reorderLevel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.abcClass && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary border border-primary/30">
                        {product.abcClass}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-3 justify-end">
                      {canCreate && (
                        <Link
                          href={`/products/${product._id}/edit`}
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Link>
                      )}
                      {canCreate && (
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="inline-flex items-center gap-1 text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!Array.isArray(products) || products.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">No products found</div>
          )}
        </div>
      )}
    </div>
  );
}

