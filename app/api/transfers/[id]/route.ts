import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/lib/models/Transfer';
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

    const transfer = await Transfer.findById(params.id)
      .populate('sourceWarehouseId', 'name code')
      .populate('targetWarehouseId', 'name code')
      .populate('requisitionId', 'requisitionNumber')
      .populate('deliveryId', 'deliveryNumber')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('lines.productId', 'name sku unit')
      .populate('lines.sourceLocationId', 'name code')
      .populate('lines.targetLocationId', 'name code');

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    return NextResponse.json(transfer);
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

    const userRole = (session.user as any)?.role;
    // Managers can only view transfers, not edit them
    if (userRole === 'MANAGER') {
      return NextResponse.json(
        { error: 'Managers cannot edit transfers' },
        { status: 403 }
      );
    }

    await connectDB();

    const transfer = await Transfer.findById(params.id);
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Only allow updates if status is DRAFT
    if (transfer.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot update transfer that is not in DRAFT status' },
        { status: 400 }
      );
    }

    // Operators can only edit transfers from their assigned warehouses
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    if (userRole === 'OPERATOR' && !assignedWarehouses.includes(transfer.sourceWarehouseId.toString())) {
      return NextResponse.json(
        { error: 'You do not have access to edit this transfer' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updated = await Transfer.findByIdAndUpdate(params.id, body, { new: true })
      .populate('sourceWarehouseId', 'name code')
      .populate('targetWarehouseId', 'name code')
      .populate('requisitionId', 'requisitionNumber')
      .populate('deliveryId', 'deliveryNumber')
      .populate('lines.productId', 'name sku')
      .populate('lines.sourceLocationId', 'name code')
      .populate('lines.targetLocationId', 'name code');

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
    const action = body.action || 'complete'; // 'complete' or 'accept'

    await connectDB();

    const transfer = await Transfer.findById(params.id);
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    const userId = new mongoose.Types.ObjectId((session.user as any).id);
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    const primaryWarehouseId = (session.user as any)?.primaryWarehouseId;

    // Handle acceptance by receiving warehouse Operator
    if (action === 'accept') {
      if (!['ADMIN', 'OPERATOR'].includes(userRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (transfer.status !== 'IN_TRANSIT') {
        return NextResponse.json(
          { error: 'Can only accept transfers in IN_TRANSIT status' },
          { status: 400 }
        );
      }

      // Verify Operator is from the receiving warehouse (targetWarehouseId)
      if (userRole === 'OPERATOR') {
        const targetWarehouseIdStr = transfer.targetWarehouseId.toString();
        const hasAccess = assignedWarehouses.some((whId: any) => {
          const whIdStr = whId?.toString ? whId.toString() : String(whId);
          return whIdStr === targetWarehouseIdStr;
        });
        
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'You can only accept transfers for your assigned warehouse' },
            { status: 403 }
          );
        }
      }

      // Update stock: increment to target (stock was already decremented from source when transfer was dispatched)
      for (const line of transfer.lines) {
        const productIdObj = line.productId instanceof mongoose.Types.ObjectId 
          ? line.productId 
          : new mongoose.Types.ObjectId(line.productId);
        const targetWarehouseIdObj = transfer.targetWarehouseId instanceof mongoose.Types.ObjectId 
          ? transfer.targetWarehouseId 
          : new mongoose.Types.ObjectId(transfer.targetWarehouseId);
        const targetLocationIdObj = line.targetLocationId 
          ? (line.targetLocationId instanceof mongoose.Types.ObjectId 
              ? line.targetLocationId 
              : new mongoose.Types.ObjectId(line.targetLocationId))
          : undefined;
        const sourceWarehouseIdObj = transfer.sourceWarehouseId instanceof mongoose.Types.ObjectId 
          ? transfer.sourceWarehouseId 
          : new mongoose.Types.ObjectId(transfer.sourceWarehouseId);
        const sourceLocationIdObj = line.sourceLocationId 
          ? (line.sourceLocationId instanceof mongoose.Types.ObjectId 
              ? line.sourceLocationId 
              : new mongoose.Types.ObjectId(line.sourceLocationId))
          : undefined;

        await updateStock(
          productIdObj,
          targetWarehouseIdObj,
          targetLocationIdObj,
          line.quantity,
          'TRANSFER',
          'TRANSFER',
          new mongoose.Types.ObjectId(transfer._id.toString()),
          userId,
          sourceWarehouseIdObj,
          sourceLocationIdObj,
          targetWarehouseIdObj,
          targetLocationIdObj
        );
      }

      // Update transfer status
      transfer.status = 'DONE';
      transfer.validatedBy = userId;
      transfer.receivedAt = new Date();
      await transfer.save();

      const populated = await Transfer.findById(transfer._id)
        .populate('sourceWarehouseId', 'name code')
        .populate('targetWarehouseId', 'name code')
        .populate('requisitionId', 'requisitionNumber')
        .populate('deliveryId', 'deliveryNumber')
        .populate('createdBy', 'name email')
        .populate('validatedBy', 'name email')
        .populate('lines.productId', 'name sku')
        .populate('lines.sourceLocationId', 'name code')
        .populate('lines.targetLocationId', 'name code');

      return NextResponse.json(populated);
    }

    // Handle completion/dispatch by source warehouse Operator (existing flow)
    if (!['ADMIN', 'OPERATOR'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (transfer.status === 'DONE') {
      return NextResponse.json({ error: 'Transfer already completed' }, { status: 400 });
    }

    if (transfer.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Transfer must be in DRAFT status to dispatch' },
        { status: 400 }
      );
    }

    // Verify Operator has access to source warehouse
    if (userRole === 'OPERATOR') {
      const sourceWarehouseIdStr = transfer.sourceWarehouseId.toString();
      const hasAccess = assignedWarehouses.some((whId: any) => {
        const whIdStr = whId?.toString ? whId.toString() : String(whId);
        return whIdStr === sourceWarehouseIdStr;
      });
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to dispatch from this warehouse' },
          { status: 403 }
        );
      }
    }

    // Check stock availability at source
    const stockIssues: any[] = [];
    for (const line of transfer.lines) {
      // Convert warehouse ID to ObjectId if needed
      const sourceWarehouseIdObj = transfer.sourceWarehouseId instanceof mongoose.Types.ObjectId 
        ? transfer.sourceWarehouseId 
        : new mongoose.Types.ObjectId(transfer.sourceWarehouseId);
      
      // Convert product ID to ObjectId if needed
      const productIdObj = line.productId instanceof mongoose.Types.ObjectId 
        ? line.productId 
        : new mongoose.Types.ObjectId(line.productId);
      
      // Convert location ID to ObjectId if provided
      const locationIdObj = line.sourceLocationId 
        ? (line.sourceLocationId instanceof mongoose.Types.ObjectId 
            ? line.sourceLocationId 
            : new mongoose.Types.ObjectId(line.sourceLocationId))
        : undefined;

      // First check at specific location if provided
      let stockCheck = await checkStockAvailability(
        productIdObj,
        sourceWarehouseIdObj,
        line.quantity,
        locationIdObj
      );

      // If not available at specific location, check total stock across all locations in warehouse
      if (!stockCheck.available) {
        const { getTotalStock } = await import('@/lib/services/stockService');
        const totalStock = await getTotalStock(productIdObj, sourceWarehouseIdObj);
        if (totalStock >= line.quantity) {
          // Total stock is sufficient, allow the transfer (will use stock from any location)
          stockCheck = { available: true, availableQuantity: totalStock };
        } else {
          stockCheck = { available: false, availableQuantity: totalStock };
        }
      }

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
          error: 'Insufficient stock at source warehouse',
          stockIssues,
        },
        { status: 400 }
      );
    }

    // Update stock: decrement from source only (target will be incremented on acceptance)
    for (const line of transfer.lines) {
      const productIdObj = line.productId instanceof mongoose.Types.ObjectId 
        ? line.productId 
        : new mongoose.Types.ObjectId(line.productId);
      const sourceWarehouseIdObj = transfer.sourceWarehouseId instanceof mongoose.Types.ObjectId 
        ? transfer.sourceWarehouseId 
        : new mongoose.Types.ObjectId(transfer.sourceWarehouseId);
      const sourceLocationIdObj = line.sourceLocationId 
        ? (line.sourceLocationId instanceof mongoose.Types.ObjectId 
            ? line.sourceLocationId 
            : new mongoose.Types.ObjectId(line.sourceLocationId))
        : undefined;
      const targetWarehouseIdObj = transfer.targetWarehouseId instanceof mongoose.Types.ObjectId 
        ? transfer.targetWarehouseId 
        : new mongoose.Types.ObjectId(transfer.targetWarehouseId);
      const targetLocationIdObj = line.targetLocationId 
        ? (line.targetLocationId instanceof mongoose.Types.ObjectId 
            ? line.targetLocationId 
            : new mongoose.Types.ObjectId(line.targetLocationId))
        : undefined;

      await updateStock(
        productIdObj,
        sourceWarehouseIdObj,
        sourceLocationIdObj,
        -line.quantity,
        'TRANSFER',
        'TRANSFER',
        new mongoose.Types.ObjectId(transfer._id.toString()),
        userId,
        sourceWarehouseIdObj,
        sourceLocationIdObj,
        targetWarehouseIdObj,
        targetLocationIdObj
      );
    }

    // Update transfer status to IN_TRANSIT
    transfer.status = 'IN_TRANSIT';
    transfer.dispatchedAt = new Date();
    await transfer.save();

    const populated = await Transfer.findById(transfer._id)
      .populate('sourceWarehouseId', 'name code')
      .populate('targetWarehouseId', 'name code')
      .populate('requisitionId', 'requisitionNumber')
      .populate('deliveryId', 'deliveryNumber')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.sourceLocationId', 'name code')
      .populate('lines.targetLocationId', 'name code');

    return NextResponse.json(populated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

