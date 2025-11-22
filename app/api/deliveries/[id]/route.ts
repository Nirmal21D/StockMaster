import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Delivery from '@/lib/models/Delivery';
import { requireAuth } from '@/lib/middleware';
import { updateStock, checkStockAvailability } from '@/lib/services/stockService';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const delivery = await Delivery.findById(params.id)
      .populate('warehouseId', 'name code')
      .populate({ path: 'targetWarehouseId', select: 'name code', strictPopulate: false })
      .populate({ path: 'requisitionId', select: 'requisitionNumber', strictPopulate: false })
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('acceptedBy', 'name email')
      .populate('lines.productId', 'name sku unit')
      .populate('lines.fromLocationId', 'name code');

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    return NextResponse.json(delivery);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const delivery = await Delivery.findById(params.id);
    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Only allow updates if status is DRAFT
    if (delivery.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot update delivery that is not in DRAFT status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await Delivery.findByIdAndUpdate(params.id, body, { new: true })
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.fromLocationId', 'name code');

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    const userRole = (session.user as any)?.role;
    const body = await request.json();
    const action = body.action || 'validate'; // 'validate', 'approve', or 'reject'

    await connectDB();

    const delivery = await Delivery.findById(params.id)
      .populate({ path: 'targetWarehouseId', select: '_id', strictPopulate: false });
    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    const userId = new mongoose.Types.ObjectId((session.user as any).id);
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    const primaryWarehouseId = (session.user as any)?.primaryWarehouseId;

    // Handle approval by Manager at target warehouse
    if (action === 'approve') {
      if (userRole !== 'MANAGER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (delivery.status !== 'WAITING') {
        return NextResponse.json(
          { error: 'Can only approve deliveries in WAITING status' },
          { status: 400 }
        );
      }

      // Verify the manager is from the target warehouse (targetWarehouseId)
      if (!delivery.targetWarehouseId) {
        return NextResponse.json(
          { error: 'Delivery does not have a target warehouse' },
          { status: 400 }
        );
      }

      // Handle both populated and unpopulated targetWarehouseId
      const targetWarehouseId = (delivery.targetWarehouseId as any)?._id || delivery.targetWarehouseId;
      const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
      const managerWarehouseIds = primaryWarehouseId 
        ? [primaryWarehouseId, ...assignedWarehouses]
        : assignedWarehouses;
      
      const hasAccess = managerWarehouseIds.some((whId: any) => {
        const whIdStr = whId?.toString ? whId.toString() : String(whId);
        return whIdStr === targetWarehouseIdStr;
      });
      
      if (!hasAccess) {
          return NextResponse.json(
          { error: 'You can only approve deliveries for your assigned warehouse' },
            { status: 403 }
          );
      }

      // Update delivery status to READY
      delivery.status = 'READY';
      delivery.acceptedBy = userId;
      delivery.acceptedAt = new Date();
      await delivery.save();

      const populated = await Delivery.findById(delivery._id)
        .populate('warehouseId', 'name code')
        .populate({ path: 'targetWarehouseId', select: 'name code', strictPopulate: false })
        .populate({ path: 'requisitionId', select: 'requisitionNumber', strictPopulate: false })
        .populate('createdBy', 'name email')
        .populate('acceptedBy', 'name email')
        .populate('lines.productId', 'name sku')
        .populate('lines.fromLocationId', 'name code');

      return NextResponse.json(populated);
    }

    // Handle rejection by Manager at target warehouse
    if (action === 'reject') {
      if (userRole !== 'MANAGER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (delivery.status !== 'WAITING') {
        return NextResponse.json(
          { error: 'Can only reject deliveries in WAITING status' },
          { status: 400 }
        );
      }

      // Verify the manager is from the target warehouse (targetWarehouseId)
      if (!delivery.targetWarehouseId) {
        return NextResponse.json(
          { error: 'Delivery does not have a target warehouse' },
          { status: 400 }
        );
      }

      // Handle both populated and unpopulated targetWarehouseId
      const targetWarehouseId = (delivery.targetWarehouseId as any)?._id || delivery.targetWarehouseId;
      const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
      const managerWarehouseIds = primaryWarehouseId 
        ? [primaryWarehouseId, ...assignedWarehouses]
        : assignedWarehouses;
      
      const hasAccess = managerWarehouseIds.some((whId: any) => {
        const whIdStr = whId?.toString ? whId.toString() : String(whId);
        return whIdStr === targetWarehouseIdStr;
      });
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You can only reject deliveries for your assigned warehouse' },
          { status: 403 }
        );
      }

      const rejectReason = body.reason || 'Rejected by manager';
      delivery.status = 'REJECTED';
      delivery.notes = delivery.notes ? `${delivery.notes}\nRejected: ${rejectReason}` : `Rejected: ${rejectReason}`;
      await delivery.save();

      const populated = await Delivery.findById(delivery._id)
        .populate('warehouseId', 'name code')
        .populate({ path: 'targetWarehouseId', select: 'name code', strictPopulate: false })
        .populate({ path: 'requisitionId', select: 'requisitionNumber', strictPopulate: false })
        .populate('createdBy', 'name email')
        .populate('acceptedBy', 'name email')
        .populate('lines.productId', 'name sku')
        .populate('lines.fromLocationId', 'name code');

      return NextResponse.json(populated);
    }

    // Handle validation by Operator (existing flow)
    if (!['ADMIN', 'OPERATOR'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (delivery.status === 'DONE') {
      return NextResponse.json({ error: 'Delivery already validated' }, { status: 400 });
    }

    // Only validate if status is READY (accepted by manager) or DRAFT (manual delivery)
    if (delivery.status !== 'READY' && delivery.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Delivery must be in READY or DRAFT status to validate' },
        { status: 400 }
      );
    }

    // For requisition-based deliveries, stock should be handled via Transfer, not validation
    if (delivery.requisitionId) {
      return NextResponse.json(
        { error: 'Requisition-based deliveries cannot be validated. Please create a Transfer instead.' },
        { status: 400 }
      );
    }

    // Check stock availability for each line
    const stockIssues: any[] = [];
    for (const line of delivery.lines) {
      const stockCheck = await checkStockAvailability(
        line.productId,
        delivery.warehouseId,
        line.quantity,
        line.fromLocationId
      );

      if (!stockCheck.available) {
        stockIssues.push({
          productId: line.productId,
          quantity: line.quantity,
          available: stockCheck.availableQuantity,
        });
      }
    }

    if (stockIssues.length > 0) {
      return NextResponse.json(
        {
          error: 'Insufficient stock',
          stockIssues,
        },
        { status: 400 }
      );
    }

    // Update stock for each line (decrement)
    for (const line of delivery.lines) {
      await updateStock(
        line.productId,
        delivery.warehouseId,
        line.fromLocationId,
        -line.quantity,
        'DELIVERY',
        'DELIVERY',
        new mongoose.Types.ObjectId(delivery._id),
        userId,
        delivery.warehouseId,
        line.fromLocationId
      );
    }

    // Update delivery status
    delivery.status = 'DONE';
    delivery.validatedBy = userId;
    delivery.validatedAt = new Date();
    await delivery.save();

    const populated = await Delivery.findById(delivery._id)
      .populate('warehouseId', 'name code')
      .populate({ path: 'targetWarehouseId', select: 'name code', strictPopulate: false })
      .populate({ path: 'requisitionId', select: 'requisitionNumber', strictPopulate: false })
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('acceptedBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.fromLocationId', 'name code');

    return NextResponse.json(populated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

