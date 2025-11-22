import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import StockMovement from '@/lib/models/StockMovement';
import StockLevel from '@/lib/models/StockLevel';
import Product from '@/lib/models/Product';
import Requisition from '@/lib/models/Requisition';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const warehouseId = searchParams.get('warehouseId');
    const period = searchParams.get('period') || '30'; // days

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Stock Movement Trends (last 7 days)
    const stockTrends = await StockMovement.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          ...(warehouseId ? { warehouseId: new mongoose.Types.ObjectId(warehouseId) } : {})
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Top Products by Movement
    const topProducts = await StockMovement.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          ...(warehouseId ? { warehouseId: new mongoose.Types.ObjectId(warehouseId) } : {})
        }
      },
      {
        $group: {
          _id: '$productId',
          totalMovement: { $sum: { $abs: '$quantity' } },
          inbound: { $sum: { $cond: [{ $gt: ['$quantity', 0] }, '$quantity', 0] } },
          outbound: { $sum: { $cond: [{ $lt: ['$quantity', 0] }, { $abs: '$quantity' }, 0] } }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $sort: { totalMovement: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 1,
          name: '$product.name',
          sku: '$product.sku',
          totalMovement: 1,
          inbound: 1,
          outbound: 1
        }
      }
    ]);

    // Stock Levels Distribution
    const stockDistribution = await StockLevel.aggregate([
      {
        $match: warehouseId ? { warehouseId: new mongoose.Types.ObjectId(warehouseId) } : {}
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          quantity: 1,
          reorderLevel: '$product.reorderLevel',
          status: {
            $cond: [
              { $eq: ['$quantity', 0] }, 'Out of Stock',
              {
                $cond: [
                  { $lt: ['$quantity', '$product.reorderLevel'] }, 'Low Stock',
                  'Normal'
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly Requisition Trends
    const requisitionTrends = await Requisition.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          ...(warehouseId ? { requestingWarehouseId: new mongoose.Types.ObjectId(warehouseId) } : {})
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    return NextResponse.json({
      stockTrends,
      topProducts,
      stockDistribution,
      requisitionTrends
    });

  } catch (error: any) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}