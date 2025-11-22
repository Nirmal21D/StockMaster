import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Requisition from '@/lib/models/Requisition';
import Warehouse from '@/lib/models/Warehouse';
import { requireAuth } from '@/lib/middleware';
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

    const query: any = {};

    const userRole = (session.user as any)?.role;
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    
    // For Operators, filter by assigned warehouses
    if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
      query.requestingWarehouseId = { $in: assignedWarehouses.map((id: string) => new mongoose.Types.ObjectId(id)) };
    } 
    // For Managers and Admins, show all requisitions (unless warehouseId filter is provided)
    else if (warehouseId) {
      query.requestingWarehouseId = new mongoose.Types.ObjectId(warehouseId);
    }
    // If no filters applied, query is empty {} which returns all requisitions (for Managers/Admins)

    if (status) {
      query.status = status;
    }

    if (search) {
      query.requisitionNumber = { $regex: search, $options: 'i' };
    }

    const requisitions = await Requisition.find(query)
      .populate('requestingWarehouseId', 'name code')
      .populate({ path: 'suggestedSourceWarehouseId', select: 'name code', strictPopulate: false })
      .populate({ path: 'finalSourceWarehouseId', select: 'name code', strictPopulate: false })
      .populate('createdBy', 'name email')
      .populate({ path: 'approvedBy', select: 'name email', strictPopulate: false })
      .populate('lines.productId', 'name sku')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(requisitions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    const userRole = (session.user as any)?.role;
    if (userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    let {
      requestingWarehouseId,
      suggestedSourceWarehouseId,
      lines,
      status,
    } = body;

    // Server-side default: If MANAGER doesn't provide warehouse, use their primary/main warehouse
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    const primaryWarehouseId = (session.user as any)?.primaryWarehouseId;
    
    if (!requestingWarehouseId) {
      requestingWarehouseId = primaryWarehouseId || (assignedWarehouses.length > 0 ? assignedWarehouses[0] : null);
    }

    if (!requestingWarehouseId || !lines || lines.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify Manager has access to this warehouse
    const requestingWarehouseIdStr = requestingWarehouseId.toString();
    const managerWarehouseIds = primaryWarehouseId 
      ? [primaryWarehouseId, ...assignedWarehouses]
      : assignedWarehouses;
    
    const hasAccess = managerWarehouseIds.some((whId: any) => {
      const whIdStr = whId?.toString ? whId.toString() : String(whId);
      return whIdStr === requestingWarehouseIdStr;
    });
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this warehouse' },
        { status: 403 }
      );
    }

    const warehouse = await Warehouse.findById(requestingWarehouseId);
    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Generate requisition number
    const count = await Requisition.countDocuments();
    const requisitionNumber = `REQ-${String(count + 1).padStart(4, '0')}`;

    // Auto-submit: Create requisition with status SUBMITTED (not DRAFT)
    const requisition = await Requisition.create({
      requisitionNumber,
      requestingWarehouseId: new mongoose.Types.ObjectId(requestingWarehouseId),
      suggestedSourceWarehouseId: suggestedSourceWarehouseId
        ? new mongoose.Types.ObjectId(suggestedSourceWarehouseId)
        : undefined,
      lines: lines.map((line: any) => ({
        productId: new mongoose.Types.ObjectId(line.productId),
        quantityRequested: line.quantityRequested,
        neededByDate: line.neededByDate ? new Date(line.neededByDate) : undefined,
      })),
      status: 'SUBMITTED', // Auto-submit on creation
      createdBy: new mongoose.Types.ObjectId((session.user as any).id),
    });

    const populated = await Requisition.findById(requisition._id)
      .populate('requestingWarehouseId', 'name code')
      .populate('suggestedSourceWarehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

