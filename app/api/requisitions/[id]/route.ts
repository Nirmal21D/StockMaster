import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Requisition from '@/lib/models/Requisition';
import Delivery from '@/lib/models/Delivery';
import Warehouse from '@/lib/models/Warehouse';
import { requireAuth } from '@/lib/middleware';
import { generateReferenceNumber } from '@/lib/utils';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const requisition = await Requisition.findById(params.id)
      .populate('requestingWarehouseId', 'name code')
      .populate('suggestedSourceWarehouseId', 'name code')
      .populate('finalSourceWarehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('lines.productId', 'name sku unit');

    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    // If requisition is approved, include the delivery in the response
    if (requisition.status === 'APPROVED') {
      const Delivery = (await import('@/lib/models/Delivery')).default;
      const delivery = await Delivery.findOne({ requisitionId: requisition._id })
        .populate('warehouseId', 'name code')
        .populate({ path: 'targetWarehouseId', select: 'name code', strictPopulate: false })
        .populate('requisitionId', 'requisitionNumber')
        .populate('createdBy', 'name email')
        .populate('lines.productId', 'name sku unit');
      
      return NextResponse.json({
        ...requisition.toObject(),
        delivery: delivery,
      });
    }

    return NextResponse.json(requisition);
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

    const requisition = await Requisition.findById(params.id);
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    // Only allow updates if status is DRAFT
    if (requisition.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot update requisition that is not in DRAFT status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await Requisition.findByIdAndUpdate(params.id, body, { new: true })
      .populate('requestingWarehouseId', 'name code')
      .populate('suggestedSourceWarehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku');

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
    const body = await request.json(); // Read body once
    const action = body.action; // 'submit', 'approve', 'reject'

    await connectDB();

    const requisition = await Requisition.findById(params.id);
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const userId = new mongoose.Types.ObjectId((session.user as any).id);

    if (action === 'approve') {
      if (userRole !== 'MANAGER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (requisition.status !== 'SUBMITTED') {
        return NextResponse.json(
          { error: 'Can only approve SUBMITTED requisitions' },
          { status: 400 }
        );
      }

      const finalSourceWarehouseId = body.finalSourceWarehouseId
        ? new mongoose.Types.ObjectId(body.finalSourceWarehouseId)
        : null;

      if (!finalSourceWarehouseId) {
        return NextResponse.json(
          { error: 'Final source warehouse is required for approval' },
          { status: 400 }
        );
      }

      // Verify the manager has access to the source warehouse
      const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
      
      if (userRole === 'MANAGER') {
        // Manager can approve if they select any of their assigned warehouses as source
        // Convert both to strings for comparison
        const finalSourceWarehouseIdStr = finalSourceWarehouseId.toString();
        const hasAccess = assignedWarehouses.some((whId: any) => {
          const whIdStr = whId?.toString ? whId.toString() : String(whId);
          return whIdStr === finalSourceWarehouseIdStr;
        });
        
        if (!hasAccess) {
          return NextResponse.json(
            { 
              error: 'You can only approve requisitions using one of your assigned warehouses as the source',
              details: {
                selectedWarehouse: finalSourceWarehouseIdStr,
                assignedWarehouses: assignedWarehouses.map((wh: any) => wh?.toString ? wh.toString() : String(wh))
              }
            },
            { status: 403 }
          );
        }
      }

      // Update requisition status
      requisition.status = 'APPROVED';
      requisition.approvedBy = userId;
      requisition.approvedAt = new Date();
      requisition.finalSourceWarehouseId = finalSourceWarehouseId;
      await requisition.save();

      // Auto-create Delivery from the source warehouse to the requesting warehouse
      const sourceWarehouse = await Warehouse.findById(finalSourceWarehouseId);
      if (!sourceWarehouse) {
        return NextResponse.json({ error: 'Source warehouse not found' }, { status: 404 });
      }

      // Generate delivery number
      const deliveryCount = await Delivery.countDocuments({ warehouseId: finalSourceWarehouseId });
      const deliveryNumber = generateReferenceNumber('WH', sourceWarehouse.code, 'OUT', deliveryCount + 1);

      // Create delivery lines from requisition lines
      const deliveryLines = requisition.lines.map((line: any) => ({
        productId: line.productId,
        quantity: line.quantityRequested,
      }));

      // Create the delivery
      const delivery = await Delivery.create({
        deliveryNumber,
        warehouseId: finalSourceWarehouseId, // Source warehouse (where stock is coming from)
        targetWarehouseId: requisition.requestingWarehouseId, // Target warehouse (where stock is going to)
        requisitionId: requisition._id,
        status: 'WAITING', // Waiting for requesting manager to accept
        lines: deliveryLines,
        reference: `Requisition: ${requisition.requisitionNumber}`,
        notes: `Auto-created from approved requisition ${requisition.requisitionNumber}`,
        createdBy: userId,
      });

      // Populate the delivery for response (use strictPopulate: false to handle optional fields)
      const populatedDelivery = await Delivery.findById(delivery._id)
        .populate('warehouseId', 'name code')
        .populate({ path: 'targetWarehouseId', select: 'name code', strictPopulate: false })
        .populate('requisitionId', 'requisitionNumber')
        .populate('createdBy', 'name email')
        .populate('lines.productId', 'name sku unit');
    } else if (action === 'reject') {
      if (userRole !== 'MANAGER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (requisition.status !== 'SUBMITTED') {
        return NextResponse.json(
          { error: 'Can only reject SUBMITTED requisitions' },
          { status: 400 }
        );
      }

      requisition.status = 'REJECTED';
      requisition.rejectedReason = body.reason || 'Rejected by manager';
      await requisition.save();
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const populated = await Requisition.findById(requisition._id)
      .populate('requestingWarehouseId', 'name code')
      .populate('suggestedSourceWarehouseId', 'name code')
      .populate('finalSourceWarehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('lines.productId', 'name sku');

    if (!populated) {
      return NextResponse.json({ error: 'Requisition not found after update' }, { status: 404 });
    }

    // If delivery was created, include it in the response
    if (action === 'approve') {
      const deliveryForRequisition = await Delivery.findOne({ requisitionId: requisition._id })
        .populate('warehouseId', 'name code')
        .populate({ path: 'targetWarehouseId', select: 'name code', strictPopulate: false })
        .populate('requisitionId', 'requisitionNumber')
        .populate('createdBy', 'name email')
        .populate('lines.productId', 'name sku unit');
      
      return NextResponse.json({
        ...populated.toObject(),
        delivery: deliveryForRequisition,
      });
    }

    return NextResponse.json(populated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

