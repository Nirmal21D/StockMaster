import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { ProductImportData } from '@/lib/services/excelImportService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission (Admin or Manager)
    const userRole = (session.user as any)?.role;
    if (!['ADMIN', 'MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { products }: { products: ProductImportData[] } = await request.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'Products array is required and must not be empty' },
        { status: 400 }
      );
    }

    await connectDB();

    const results = {
      total: products.length,
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; sku: string; error: string }>,
    };

    for (let i = 0; i < products.length; i++) {
      const productData = products[i];
      
      try {
        // Check if product with SKU already exists
        const existingProduct = await Product.findOne({ sku: productData.sku });
        
        if (existingProduct) {
          // Update existing product
          await Product.findByIdAndUpdate(
            existingProduct._id,
            {
              name: productData.name,
              category: productData.category,
              unit: productData.unit,
              price: productData.price,
              reorderLevel: productData.reorderLevel,
              abcClass: productData.abcClass,
            },
            { new: true }
          );
          results.updated++;
        } else {
          // Create new product
          await Product.create({
            name: productData.name,
            sku: productData.sku,
            category: productData.category,
            unit: productData.unit,
            price: productData.price,
            reorderLevel: productData.reorderLevel,
            abcClass: productData.abcClass,
            isActive: true,
          });
          results.created++;
        }
      } catch (error) {
        console.error(`Error processing product ${productData.sku}:`, error);
        results.errors.push({
          row: i + 1,
          sku: productData.sku,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${results.created} created, ${results.updated} updated`,
      results,
    });

  } catch (error) {
    console.error('Bulk product import error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}