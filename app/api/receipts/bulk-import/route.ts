import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Receipt from '@/lib/models/Receipt';
import Product from '@/lib/models/Product';
import Warehouse from '@/lib/models/Warehouse';
import Location from '@/lib/models/Location';
import { stockService } from '@/lib/services/stockService';
import { ReceiptImportData } from '@/lib/services/excelImportService';

interface GroupedReceiptData {
  supplierName: string;
  warehouseId: string;
  reference?: string;
  lines: Array<{
    productId: string;
    locationId?: string;
    quantity: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receipts }: { receipts: ReceiptImportData[] } = await request.json();

    if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
      return NextResponse.json(
        { error: 'Receipts array is required and must not be empty' },
        { status: 400 }
      );
    }

    await connectDB();

    const results = {
      total: receipts.length,
      receiptsCreated: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    // First, validate all data and collect IDs
    const validatedReceipts: Array<{
      original: ReceiptImportData;
      productId: string;
      warehouseId: string;
      locationId?: string;
      index: number;
    }> = [];

    for (let i = 0; i < receipts.length; i++) {
      const receiptData = receipts[i];
      
      try {
        // Find product by SKU
        const product = await Product.findOne({ sku: receiptData.productSku, isActive: true });
        if (!product) {
          results.errors.push({
            row: i + 1,
            error: `Product with SKU '${receiptData.productSku}' not found`,
          });
          continue;
        }

        // Find warehouse by name
        const warehouse = await Warehouse.findOne({ 
          name: { $regex: new RegExp(`^${receiptData.warehouseName}$`, 'i') },
          isActive: true 
        });
        if (!warehouse) {
          results.errors.push({
            row: i + 1,
            error: `Warehouse '${receiptData.warehouseName}' not found`,
          });
          continue;
        }

        // Find location if specified
        let locationId: string | undefined;
        if (receiptData.locationName) {
          const location = await Location.findOne({
            warehouseId: warehouse._id,
            name: { $regex: new RegExp(`^${receiptData.locationName}$`, 'i') },
            isActive: true,
          });
          if (!location) {
            results.errors.push({
              row: i + 1,
              error: `Location '${receiptData.locationName}' not found in warehouse '${receiptData.warehouseName}'`,
            });
            continue;
          }
          locationId = location._id.toString();
        }

        validatedReceipts.push({
          original: receiptData,
          productId: product._id.toString(),
          warehouseId: warehouse._id.toString(),
          locationId,
          index: i,
        });
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Validation error',
        });
      }
    }

    // Group receipts by supplier and warehouse
    const groupedReceipts = new Map<string, GroupedReceiptData>();

    for (const validated of validatedReceipts) {
      const key = `${validated.original.supplierName}|${validated.warehouseId}|${validated.original.reference || ''}`;
      
      if (!groupedReceipts.has(key)) {
        groupedReceipts.set(key, {
          supplierName: validated.original.supplierName,
          warehouseId: validated.warehouseId,
          reference: validated.original.reference,
          lines: [],
        });
      }

      groupedReceipts.get(key)!.lines.push({
        productId: validated.productId,
        locationId: validated.locationId,
        quantity: validated.original.quantity,
      });
    }

    // Create receipts
    for (const [, receiptGroup] of groupedReceipts) {
      try {
        // Generate receipt number
        const receiptCount = await Receipt.countDocuments();
        const receiptNumber = `REC${String(receiptCount + 1).padStart(6, '0')}`;

        // Create receipt
        const receipt = await Receipt.create({
          receiptNumber,
          supplierName: receiptGroup.supplierName,
          warehouseId: receiptGroup.warehouseId,
          reference: receiptGroup.reference,
          status: 'WAITING',
          lines: receiptGroup.lines,
          createdBy: (session.user as any).id,
        });

        // Auto-validate the receipt (update stock levels)
        for (const line of receiptGroup.lines) {
          await stockService.increaseStock(
            line.productId,
            receiptGroup.warehouseId,
            line.quantity,
            line.locationId,
            'RECEIPT',
            receipt._id.toString(),
            (session.user as any).id
          );
        }

        // Update receipt status
        await Receipt.findByIdAndUpdate(receipt._id, {
          status: 'DONE',
          validatedBy: (session.user as any).id,
          validatedAt: new Date(),
        });

        results.receiptsCreated++;
      } catch (error) {
        console.error('Error creating receipt:', error);
        results.errors.push({
          row: 0,
          error: `Failed to create receipt for ${receiptGroup.supplierName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${results.receiptsCreated} receipts created from ${validatedReceipts.length} valid entries`,
      results,
    });

  } catch (error) {
    console.error('Bulk receipt import error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}