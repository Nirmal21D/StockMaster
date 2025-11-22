import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Delivery from '@/lib/models/Delivery';
import Warehouse from '@/lib/models/Warehouse';
import { requireAuth } from '@/lib/middleware';
import { generateReferenceNumber } from '@/lib/utils';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const requisitionId = searchParams.get('requisitionId');

    const query: any = {};

    // If requisitionId is provided, prioritize it (for finding delivery from requisition)
    if (requisitionId) {
      query.requisitionId = new mongoose.Types.ObjectId(requisitionId);
    } else {
      // For Operators, filter by assigned warehouses (source warehouse)
      const userRole = (session.user as any)?.role;
      const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
      const primaryWarehouseId = (session.user as any)?.primaryWarehouseId;
      
      if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
        query.warehouseId = { $in: assignedWarehouses.map((id: string) => new mongoose.Types.ObjectId(id)) };
      } else if (userRole === 'MANAGER' && assignedWarehouses.length > 0) {
        // Managers should see deliveries they need to accept (targetWarehouseId matches their warehouse)
        // and deliveries from their warehouse (warehouseId matches)
        const managerWarehouseIds = primaryWarehouseId 
          ? [primaryWarehouseId, ...assignedWarehouses]
          : assignedWarehouses;
        const warehouseObjectIds = managerWarehouseIds.map((id: string) => new mongoose.Types.ObjectId(id));
        query.$or = [
          { warehouseId: { $in: warehouseObjectIds } },
          { targetWarehouseId: { $in: warehouseObjectIds } },
        ];
      } else if (warehouseId) {
      query.warehouseId = new mongoose.Types.ObjectId(warehouseId);
      }
    }

    if (status) {
      query.status = status;
    }

    if (search && !requisitionId) {
      // Only apply search if not searching by requisitionId
      const searchOr = [
        { deliveryNumber: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
      
      // If there's already an $or for warehouse filtering, combine them
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchOr }
        ];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const deliveries = await Delivery.find(query)
      .populate('warehouseId', 'name code')
      .populate({ path: 'targetWarehouseId', select: 'name code', strictPopulate: false })
      .populate({ path: 'requisitionId', select: 'requisitionNumber', strictPopulate: false })
      .populate('createdBy', 'name email')
      .populate('acceptedBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.fromLocationId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(deliveries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    const userRole = (session.user as any)?.role;
    // Only MANAGER can create deliveries
    if (userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const {
      warehouseId,
      targetWarehouseId,
      requisitionId,
      reference,
      notes,
      lines,
      status,
      scheduleDate,
      responsible,
    } = body;

    if (!warehouseId || !targetWarehouseId || !lines || lines.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: warehouseId, targetWarehouseId, and lines are required' }, { status: 400 });
    }

    // For Operators and Managers, verify they have access to the source warehouse
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    const primaryWarehouseId = (session.user as any)?.primaryWarehouseId;
    const managerWarehouseIds = primaryWarehouseId 
      ? [primaryWarehouseId, ...assignedWarehouses]
      : assignedWarehouses;
    
    if (userRole === 'OPERATOR') {
      const hasAccess = assignedWarehouses.some((whId: any) => {
        const whIdStr = whId?.toString ? whId.toString() : String(whId);
        return whIdStr === warehouseId.toString();
      });
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this warehouse' },
          { status: 403 }
        );
      }
    } else if (userRole === 'MANAGER') {
      // Manager must have access to source warehouse
      const hasAccess = managerWarehouseIds.some((whId: any) => {
        const whIdStr = whId?.toString ? whId.toString() : String(whId);
        return whIdStr === warehouseId.toString();
      });
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to the source warehouse' },
          { status: 403 }
        );
      }
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Generate delivery number
    const count = await Delivery.countDocuments({ warehouseId });
    const deliveryNumber = generateReferenceNumber('WH', warehouse.code, 'OUT', count + 1);

    const delivery = await Delivery.create({
      deliveryNumber,
      warehouseId: new mongoose.Types.ObjectId(warehouseId),
      targetWarehouseId: new mongoose.Types.ObjectId(targetWarehouseId),
      requisitionId: requisitionId ? new mongoose.Types.ObjectId(requisitionId) : undefined,
      reference,
      notes,
      lines: lines.map((line: any) => ({
        productId: new mongoose.Types.ObjectId(line.productId),
        fromLocationId: line.fromLocationId
          ? new mongoose.Types.ObjectId(line.fromLocationId)
          : undefined,
        quantity: line.quantity,
      })),
      status: status || 'DRAFT',
      scheduleDate: scheduleDate ? new Date(scheduleDate) : undefined,
      responsible: responsible || (session.user as any).name,
      createdBy: new mongoose.Types.ObjectId((session.user as any).id),
    });

    const populated = await Delivery.findById(delivery._id)
      .populate('warehouseId', 'name code')
      .populate({ path: 'targetWarehouseId', select: 'name code', strictPopulate: false })
      .populate({ path: 'requisitionId', select: 'requisitionNumber', strictPopulate: false })
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.fromLocationId', 'name code');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

