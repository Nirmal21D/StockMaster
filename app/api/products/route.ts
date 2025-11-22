import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import StockLevel from '@/lib/models/StockLevel';
import { requireAuth, requireRole } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const abcClass = searchParams.get('abcClass');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (abcClass) {
      query.abcClass = abcClass;
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    // Get warehouse filter for Operators
    const userRole = (session.user as any)?.role;
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    let warehouseFilter: mongoose.Types.ObjectId[] | null = null;
    if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
      warehouseFilter = assignedWarehouses.map((id: string) => new mongoose.Types.ObjectId(id));
    }

    // Get total quantities for each product
    const productsWithQuantities = await Promise.all(
      products.map(async (product) => {
        const stockQuery: any = { productId: product._id };
        if (warehouseFilter) {
          stockQuery.warehouseId = { $in: warehouseFilter };
        }
        const stockLevels = await StockLevel.find(stockQuery);
        const totalQuantity = stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);
        return {
          ...product.toObject(),
          totalQuantity,
        };
      })
    );

    return NextResponse.json({
      products: productsWithQuantities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(request, ['ADMIN', 'MANAGER']);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const body = await request.json();
    const { name, sku, category, unit, price, reorderLevel, abcClass, description, isActive } = body;

    if (!name || !sku || !unit || reorderLevel === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const product = await Product.create({
      name,
      sku,
      category,
      unit,
      price,
      reorderLevel,
      abcClass,
      description,
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

