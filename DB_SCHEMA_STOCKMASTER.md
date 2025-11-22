1. Database Design (MongoDB)

You’re using:

Next.js + NextAuth

MongoDB

3 roles: ADMIN, OPERATOR, MANAGER

We’ll design collections in a Mongo-idiomatic way:
👉 major documents (receipt, delivery, requisition, transfer) will embed line items as arrays.

1.1 users (NextAuth + role)

If you use the official MongoDB adapter, NextAuth already creates users, accounts, sessions, etc. You just extend users with your custom fields.

Collection: users

{
  _id: ObjectId,
  name: string,
  email: string,
  emailVerified?: Date | null,
  image?: string | null,

  // Custom fields
  role: 'ADMIN' | 'OPERATOR' | 'MANAGER',
  isActive: boolean,

  createdAt: Date,
  updatedAt: Date
}


Indexes:

unique on email

index on role

1.2 warehouses
{
  _id: ObjectId,
  name: string,          // "Mumbai Central", "Pune Store"
  code: string,          // "WH_MUM", "WH_PUNE"
  address?: string,
  description?: string,
  isActive: boolean,

  createdAt: Date,
  updatedAt: Date
}


Indexes:

unique on code

index on isActive

1.3 locations

Each warehouse can have many locations (rack/shelf/bin).

{
  _id: ObjectId,
  warehouseId: ObjectId, // ref: warehouses._id
  name: string,          // "Rack A - Shelf 2"
  code?: string,
  description?: string,
  isActive: boolean,

  createdAt: Date,
  updatedAt: Date
}


Indexes:

index on warehouseId

compound index on { warehouseId, name }

1.4 products
{
  _id: ObjectId,
  name: string,
  sku: string,                 // unique code
  category?: string,           // "Raw Material", "Finished Goods"
  unit: string,                // "kg", "pcs"
  price?: number,              // optional, used for ABC analysis
  reorderLevel: number,        // for low-stock alert

  // Analytics flags
  abcClass?: 'A' | 'B' | 'C',  // optional, can be computed & stored

  isActive: boolean,

  createdAt: Date,
  updatedAt: Date
}


Indexes:

unique on sku

index on category

index on abcClass

1.5 stockLevels

Represents current stock per product per warehouse/location.

{
  _id: ObjectId,
  productId: ObjectId,
  warehouseId: ObjectId,
  locationId?: ObjectId,     // optional if you allow warehouse-level only
  quantity: number,          // current quantity

  updatedAt: Date
}


Indexes:

unique compound index: { productId, warehouseId, locationId }

index on { productId, warehouseId }

All stock changes (receipts, deliveries, transfers, adjustments) ultimately update this collection.

1.6 receipts (Incoming stock)

Embed lines inside the receipt document.

{
  _id: ObjectId,
  receiptNumber: string,       // human-readable ID
  supplierName?: string,
  warehouseId: ObjectId,
  status: 'DRAFT' | 'WAITING' | 'DONE',

  reference?: string,          // invoice/PO no.
  notes?: string,

  lines: [
    {
      productId: ObjectId,
      locationId?: ObjectId,
      quantity: number
    }
  ],

  createdBy: ObjectId,         // userId
  validatedBy?: ObjectId,
  createdAt: Date,
  updatedAt: Date,
  validatedAt?: Date
}


Indexes:

index on warehouseId

index on status

index on createdAt

1.7 deliveries (Outgoing stock)
{
  _id: ObjectId,
  deliveryNumber: string,
  customerName?: string,
  warehouseId: ObjectId,
  status: 'DRAFT' | 'WAITING' | 'READY' | 'DONE',

  reference?: string,          // sales order, invoice
  notes?: string,

  lines: [
    {
      productId: ObjectId,
      fromLocationId?: ObjectId,
      quantity: number
    }
  ],

  createdBy: ObjectId,
  validatedBy?: ObjectId,

  createdAt: Date,
  updatedAt: Date,
  validatedAt?: Date
}


Indexes:

index on warehouseId

index on status

index on createdAt

1.8 requisitions (Internal stock request)
{
  _id: ObjectId,
  requisitionNumber: string,

  // who needs stock
  requestingWarehouseId: ObjectId,

  // suggested source warehouse (optional, or set by system)
  suggestedSourceWarehouseId?: ObjectId,

  // final chosen source by manager (optional)
  finalSourceWarehouseId?: ObjectId,

  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED',

  lines: [
    {
      productId: ObjectId,
      quantityRequested: number,
      neededByDate?: Date
    }
  ],

  createdBy: ObjectId,        // Operator
  approvedBy?: ObjectId,      // Manager
  rejectedReason?: string,

  createdAt: Date,
  updatedAt: Date,
  approvedAt?: Date
}


Indexes:

index on requestingWarehouseId

index on status

index on createdAt

1.9 transfers (Internal transfer)
{
  _id: ObjectId,
  transferNumber: string,

  requisitionId?: ObjectId,  // link to requisitions._id

  sourceWarehouseId: ObjectId,
  targetWarehouseId: ObjectId,

  status: 'DRAFT' | 'IN_TRANSIT' | 'DONE',

  lines: [
    {
      productId: ObjectId,
      sourceLocationId?: ObjectId,
      targetLocationId?: ObjectId,
      quantity: number
    }
  ],

  createdBy: ObjectId,       // usually Manager
  validatedBy?: ObjectId,

  createdAt: Date,
  updatedAt: Date,
  dispatchedAt?: Date,
  receivedAt?: Date
}


Indexes:

index on sourceWarehouseId

index on targetWarehouseId

index on status

index on requisitionId

1.10 adjustments
{
  _id: ObjectId,
  adjustmentNumber: string,

  productId: ObjectId,
  warehouseId: ObjectId,
  locationId?: ObjectId,

  oldQuantity: number,
  newQuantity: number,
  difference: number,     // new - old

  reason: 'DAMAGE' | 'LOSS' | 'COUNT_ERROR' | 'OTHER',
  remarks?: string,

  createdBy: ObjectId,
  createdAt: Date
}


Indexes:

index on productId

index on warehouseId

index on createdAt

1.11 stockMovements (Ledger / audit trail)

This is core for analytics.

{
  _id: ObjectId,
  productId: ObjectId,

  warehouseFromId?: ObjectId,
  locationFromId?: ObjectId,
  warehouseToId?: ObjectId,
  locationToId?: ObjectId,

  change: number,           // +/- quantity (can be normalized as one row per movement)

  type: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT',

  documentType: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT',
  documentId: ObjectId,

  createdBy: ObjectId,
  createdAt: Date
}


Indexes:

index on productId

index on warehouseFromId

index on warehouseToId

index on type

index on createdAt

You’ll use this for:

Last movement date (slow/dead stock)

Usage per period (for forecasting)

Stockout frequency

Anomaly detection, etc.
