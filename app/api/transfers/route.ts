import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/lib/models/Transfer';
import Warehouse from '@/lib/models/Warehouse';
import Requisition from '@/lib/models/Requisition';
import { requireAuth } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const warehouseIds = searchParams.getAll('warehouseId');
    const status = searchParams.get('status');

    const query: any = {};
    const userRole = (session.user as any)?.role;
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];

    // For Operators, filter by their assigned warehouses if not already filtered
    if (userRole === 'OPERATOR' && assignedWarehouses.length > 0 && warehouseIds.length === 0) {
      // Convert assignedWarehouses to ObjectIds (handle both string and ObjectId formats)
      const warehouseObjectIds = assignedWarehouses.map((id: any) => {
        if (id instanceof mongoose.Types.ObjectId) {
          return id;
        }
        if (typeof id === 'string') {
          return new mongoose.Types.ObjectId(id);
        }
        return new mongoose.Types.ObjectId(String(id));
      });
      
      // Operators should see transfers where they are either source OR target warehouse
      // This allows them to see:
      // - DRAFT transfers from their warehouse (can dispatch)
      // - IN_TRANSIT transfers to their warehouse (can receive)
      query.$or = [
        { sourceWarehouseId: { $in: warehouseObjectIds } },
        { targetWarehouseId: { $in: warehouseObjectIds } },
      ];
    } else if (warehouseIds.length > 0) {
      // Handle multiple warehouse IDs
      const warehouseObjectIds = warehouseIds.map((id: string) => new mongoose.Types.ObjectId(id));
      query.$or = [
        { sourceWarehouseId: { $in: warehouseObjectIds } },
        { targetWarehouseId: { $in: warehouseObjectIds } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const transfers = await Transfer.find(query)
      .populate('sourceWarehouseId', 'name code')
      .populate('targetWarehouseId', 'name code')
      .populate('requisitionId', 'requisitionNumber')
      .populate('deliveryId', 'deliveryNumber')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.sourceLocationId', 'name code')
      .populate('lines.targetLocationId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(transfers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    const userRole = (session.user as any)?.role;
    // Only OPERATOR can create transfers
    if (userRole !== 'OPERATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const {
      requisitionId,
      deliveryId,
      sourceWarehouseId,
      targetWarehouseId,
      lines,
      status,
    } = body;

    // If deliveryId is provided, use it to create transfer
    if (deliveryId) {
      const Delivery = (await import('@/lib/models/Delivery')).default;
      const delivery = await Delivery.findById(deliveryId)
        .populate('warehouseId', 'name code')
        .populate('targetWarehouseId', 'name code')
        .populate('requisitionId', 'requisitionNumber');

      if (!delivery) {
        return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
      }

      if (delivery.status !== 'READY') {
        return NextResponse.json(
          { error: 'Delivery must be in READY status to create transfer' },
          { status: 400 }
        );
      }

      // Verify Operator has access to source warehouse
      const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
      const sourceWarehouseIdStr = delivery.warehouseId._id.toString();
      const hasAccess = assignedWarehouses.some((whId: any) => {
        const whIdStr = whId?.toString ? whId.toString() : String(whId);
        return whIdStr === sourceWarehouseIdStr;
      });
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to the source warehouse' },
          { status: 403 }
        );
      }

      // Create transfer from delivery
      const count = await Transfer.countDocuments();
      const transferNumber = `TRF-${String(count + 1).padStart(4, '0')}`;

      const transfer = await Transfer.create({
        transferNumber,
        requisitionId: delivery.requisitionId ? new mongoose.Types.ObjectId(delivery.requisitionId._id) : undefined,
        deliveryId: new mongoose.Types.ObjectId(deliveryId),
        sourceWarehouseId: new mongoose.Types.ObjectId(delivery.warehouseId._id),
        targetWarehouseId: delivery.targetWarehouseId ? new mongoose.Types.ObjectId(delivery.targetWarehouseId._id) : new mongoose.Types.ObjectId(targetWarehouseId),
        lines: delivery.lines.map((line: any) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        status: 'DRAFT',
        createdBy: new mongoose.Types.ObjectId((session.user as any).id),
      });

      const populated = await Transfer.findById(transfer._id)
        .populate('sourceWarehouseId', 'name code')
        .populate('targetWarehouseId', 'name code')
        .populate('requisitionId', 'requisitionNumber')
        .populate('deliveryId', 'deliveryNumber')
        .populate('createdBy', 'name email')
        .populate('lines.productId', 'name sku')
        .populate('lines.sourceLocationId', 'name code')
        .populate('lines.targetLocationId', 'name code');

      return NextResponse.json(populated, { status: 201 });
    }

    // Manual transfer creation (existing flow)
    if (!sourceWarehouseId || !targetWarehouseId || !lines || lines.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate warehouses
    const sourceWarehouse = await Warehouse.findById(sourceWarehouseId);
    const targetWarehouse = await Warehouse.findById(targetWarehouseId);

    if (!sourceWarehouse || !targetWarehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Verify Operator has access to source warehouse
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    const sourceWarehouseIdStr = sourceWarehouseId.toString();
    const hasAccess = assignedWarehouses.some((whId: any) => {
      const whIdStr = whId?.toString ? whId.toString() : String(whId);
      return whIdStr === sourceWarehouseIdStr;
    });
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to the source warehouse' },
        { status: 403 }
      );
    }

    // If linked to requisition, validate it
    if (requisitionId) {
      const requisition = await Requisition.findById(requisitionId);
      if (!requisition || requisition.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Requisition must be APPROVED to create transfer' },
          { status: 400 }
        );
      }
    }

    // Generate transfer number
    const count = await Transfer.countDocuments();
    const transferNumber = `TRF-${String(count + 1).padStart(4, '0')}`;

    const transfer = await Transfer.create({
      transferNumber,
      requisitionId: requisitionId ? new mongoose.Types.ObjectId(requisitionId) : undefined,
      sourceWarehouseId: new mongoose.Types.ObjectId(sourceWarehouseId),
      targetWarehouseId: new mongoose.Types.ObjectId(targetWarehouseId),
      lines: lines.map((line: any) => ({
        productId: new mongoose.Types.ObjectId(line.productId),
        sourceLocationId: line.sourceLocationId
          ? new mongoose.Types.ObjectId(line.sourceLocationId)
          : undefined,
        targetLocationId: line.targetLocationId
          ? new mongoose.Types.ObjectId(line.targetLocationId)
          : undefined,
        quantity: line.quantity,
      })),
      status: status || 'DRAFT',
      createdBy: new mongoose.Types.ObjectId((session.user as any).id),
    });

    const populated = await Transfer.findById(transfer._id)
      .populate('sourceWarehouseId', 'name code')
      .populate('targetWarehouseId', 'name code')
      .populate('requisitionId', 'requisitionNumber')
      .populate('deliveryId', 'deliveryNumber')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.sourceLocationId', 'name code')
      .populate('lines.targetLocationId', 'name code');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

