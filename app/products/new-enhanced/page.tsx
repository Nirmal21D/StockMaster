'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Save, Upload, Download, FileSpreadsheet, Plus } from 'lucide-react';
import Link from 'next/link';
import ExcelDropzone from '@/components/ExcelDropzone';
import ImportPreview from '@/components/ImportPreview';
import ExcelImportService, { ProductImportData, ExcelImportResult } from '@/lib/services/excelImportService';

type ImportMode = 'manual' | 'excel';
type ImportStep = 'upload' | 'preview' | 'processing';

export default function NewProductPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<ImportMode>('manual');
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<ExcelImportResult<ProductImportData> | null>(null);
  
  // Manual form data
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unit: 'pcs',
    price: '',
    reorderLevel: '0',
    abcClass: '',
  });

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (session && userRole && !['ADMIN', 'MANAGER'].includes(userRole)) {
      router.push('/products');
    }
  }, [session, userRole, router]);

  if (!session || (userRole && !['ADMIN', 'MANAGER'].includes(userRole))) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to create products.</p>
        </div>
      </div>
    );
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: formData.price ? parseFloat(formData.price) : undefined,
          reorderLevel: parseInt(formData.reorderLevel),
          abcClass: formData.abcClass || undefined,
        }),
      });

      if (response.ok) {
        router.push('/products');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create product');
      }
    } catch (error) {
      setError('An error occurred while creating the product');
    } finally {
      setLoading(false);
    }
  };

  const handleExcelFileProcessed = (data: any[]) => {
    const result = ExcelImportService.validateProductImport(data);
    setImportResult(result);
    setImportStep('preview');
  };

  const handleExcelError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleImportConfirm = async (products: ProductImportData[]) => {
    setLoading(true);
    setImportStep('processing');
    
    try {
      const response = await fetch('/api/products/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });

      const result = await response.json();
      
      if (response.ok) {
        router.push(`/products?import_success=true&created=${result.results.created}&updated=${result.results.updated}`);
      } else {
        setError(result.error || 'Failed to import products');
        setImportStep('preview');
      }
    } catch (error) {
      setError('An error occurred during import');
      setImportStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCancel = () => {
    setImportResult(null);
    setImportStep('upload');
    setError('');
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/templates?type=products');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'products_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download template');
      }
    } catch (error) {
      setError('An error occurred while downloading template');
    }
  };

  const productColumns = [
    { key: 'name' as keyof ProductImportData, label: 'Product Name' },
    { key: 'sku' as keyof ProductImportData, label: 'SKU' },
    { key: 'category' as keyof ProductImportData, label: 'Category' },
    { key: 'unit' as keyof ProductImportData, label: 'Unit' },
    { 
      key: 'price' as keyof ProductImportData, 
      label: 'Price',
      render: (value: any) => value ? `$${Number(value).toFixed(2)}` : '-'
    },
    { key: 'reorderLevel' as keyof ProductImportData, label: 'Reorder Level' },
    { key: 'abcClass' as keyof ProductImportData, label: 'ABC Class' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            href="/products"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Link>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">
          Add New Products
        </h1>
        <p className="text-gray-400">
          Choose between manual entry for single products or Excel import for bulk operations.
        </p>
      </div>

      {/* Mode Selection */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setMode('manual');
              setImportStep('upload');
              setImportResult(null);
              setError('');
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
              mode === 'manual'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>
          
          <button
            onClick={() => {
              setMode('excel');
              setImportStep('upload');
              setImportResult(null);
              setError('');
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
              mode === 'excel'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Import</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-500/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* Manual Entry Mode */}
      {mode === 'manual' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Product Information</h2>
          
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  SKU *
                </label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter SKU"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter category"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Unit *
                </label>
                <select
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pcs">Pieces</option>
                  <option value="kg">Kilograms</option>
                  <option value="ltr">Liters</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                  <option value="roll">Roll</option>
                  <option value="meter">Meter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reorder Level *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ABC Classification
                </label>
                <select
                  value={formData.abcClass}
                  onChange={(e) => setFormData({ ...formData, abcClass: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select ABC Class</option>
                  <option value="A">A - High Value</option>
                  <option value="B">B - Medium Value</option>
                  <option value="C">C - Low Value</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Link
                href="/products"
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <Save className="w-4 h-4" />
                <span>{loading ? 'Creating...' : 'Create Product'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Excel Import Mode */}
      {mode === 'excel' && (
        <div className="space-y-6">
          {/* Download Template */}
          <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Download className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-blue-400 font-medium mb-1">Download Template</h3>
                <p className="text-gray-300 text-sm mb-3">
                  Download the Excel template with the required column format and sample data.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Products Template</span>
                </button>
              </div>
            </div>
          </div>

          {/* Upload Step */}
          {importStep === 'upload' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Upload Excel File</h2>
              <ExcelDropzone
                onFileProcessed={handleExcelFileProcessed}
                onError={handleExcelError}
              />
            </div>
          )}

          {/* Preview Step */}
          {importStep === 'preview' && importResult && (
            <ImportPreview
              result={importResult}
              columns={productColumns}
              onConfirm={handleImportConfirm}
              onCancel={handleImportCancel}
              isProcessing={loading}
            />
          )}
        </div>
      )}
    </div>
  );
}