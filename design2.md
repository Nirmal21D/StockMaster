Hey Cursor, this is how my entire StockMaster web app should work. Please implement the system (pages, APIs, flows, and permissions) according to this description.

1. Authentication & User Lifecycle
1.1 Sign up

There is a public signup page (/signup) where new users can register with:

name

email

password

optional note/reason

When someone signs up:

Create a User with:

role = null (no power yet)

status = "PENDING"

assignedWarehouses = []

A PENDING user cannot log in to the app yet.

1.2 Login

Login is done via NextAuth on /login.

On login:

If status !== "ACTIVE" → deny access and show message:

"Your account is pending admin approval" or "Your account is inactive".

1.3 Admin approval

There is an Admin Users page (/admin/users or /settings/users) only for role = "ADMIN".

On this page, Admin can:

See all users with: name, email, role, status, assignedWarehouses.

Approve a user:

Choose role: MANAGER or OPERATOR.

Assign one or more warehouses.

Set status = "ACTIVE".

Reject / deactivate a user:

Set status = "INACTIVE".

Change role later:

If changing to MANAGER, ask for confirmation (extra danger step).

Change assigned warehouses (add/remove).

1.4 Session data

In the session (session.user), we must have:

role (ADMIN / MANAGER / OPERATOR)

status

assignedWarehouses

primaryWarehouseId (optional)

All protected routes check:

Authenticated

status === "ACTIVE"

2. Roles & What They Can Do (Global)
2.1 Admin

Manages the system setup:

Users (approve, role, warehouses)

Warehouses & Locations (CRUD)

Products (CRUD)

Can see and do everything if needed (emergency).

2.2 Manager

Controls inventory decisions:

Full CRUD on Products

Approve/Reject Requisitions

Create/Validate Transfers between warehouses

View all Receipts/Deliveries (read-only)

View all Ledger & Dashboard analytics

No user/warehouse/location management.

2.3 Operator

Does daily warehouse work for their assigned warehouses:

Create/Edit/Validate Receipts (incoming stock)

Create/Edit/Validate Deliveries (outgoing stock)

Create and Submit Requisitions (internal requests)

Create Adjustments (if allowed) to correct stock

View Products with quantities (read-only master)

View Ledger entries for their warehouses

View Dashboard (read-only)

Cannot:

Approve Requisitions

Create/Validate Transfers

Manage products/users/warehouses

Permissions must be enforced:

In API routes (backend)

In UI (what menu items & buttons are shown)

3. Core Data Models (conceptual)

We have these core collections:

User

name, email, passwordHash (or auth provider)

role: "ADMIN" | "MANAGER" | "OPERATOR" | null

status: "PENDING" | "ACTIVE" | "INACTIVE"

assignedWarehouses: [warehouseId]

primaryWarehouseId?: warehouseId

Warehouse

name, code, address, isActive

Location

warehouseId, name, code, isActive

Product (master data, no quantity)

name, sku (unique), category, unit, reorderLevel

price?, abcClass?, description?, isActive

StockLevel (actual quantity)

productId

warehouseId

locationId?

quantity

updatedAt

unique index on (productId, warehouseId, locationId)

Receipt (incoming)

receiptNumber, supplierName, warehouseId, status

lines: [{ productId, locationId, quantity }]

createdBy, validatedBy, createdAt, validatedAt

Delivery (outgoing)

deliveryNumber, customerName, warehouseId, status

lines: [{ productId, fromLocationId, quantity }]

createdBy, validatedBy, createdAt, validatedAt

Requisition (request)

requisitionNumber

requestingWarehouseId

suggestedSourceWarehouseId?

finalSourceWarehouseId?

status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED"

lines: [{ productId, quantityRequested, neededByDate? }]

createdBy, approvedBy?, rejectedReason?, timestamps

Transfer (internal move)

transferNumber

requisitionId?

sourceWarehouseId

targetWarehouseId

status: "DRAFT" | "IN_TRANSIT" | "DONE"

lines: [{ productId, sourceLocationId, targetLocationId, quantity }]

createdBy, validatedBy, timestamps

Adjustment (correction)

adjustmentNumber

productId, warehouseId, locationId

oldQuantity, newQuantity, difference

reason, remarks, createdBy, createdAt

StockMovement (ledger)

productId

warehouseFromId?, warehouseToId?

locationFromId?, locationToId?

change (signed number)

type: "RECEIPT" | "DELIVERY" | "TRANSFER" | "ADJUSTMENT"

documentType, documentId

createdBy, createdAt

Every time stock changes, we:

Update StockLevel

Insert a StockMovement

4. Layout & Navigation Flow

There is an app layout with:

Sidebar navigation (pages depending on role)

Topbar:

Current user info (name + role)

Global warehouse filter (All / specific warehouse)

4.1 Sidebar per role

Admin sees:

Dashboard

Products

Receipts

Deliveries

Requisitions

Transfers

Adjustments

Ledger

Settings/Admin:

Users

Warehouses

Locations

Manager sees:

Dashboard

Products

Receipts (view-only)

Deliveries (view-only)

Requisitions (Approve/Reject)

Transfers (Create/Validate)

Adjustments (view / create if allowed)

Ledger

Settings (read-only Warehouses/Locations lists)

Operator sees:

Dashboard

Products (read-only)

Receipts

Deliveries

Requisitions (create/submit)

Adjustments (create for assigned warehouses)

Ledger (filtered to assigned warehouses)

No Users, no master-data Settings

5. Main Functional Flows
5.1 Admin: System Setup

Flow:

Admin logs in.

Admin goes to Settings → Warehouses:

Creates warehouses: e.g., Mumbai, Pune.

Admin goes to Products:

Creates products: Cement Bag, Steel Rod, etc. (with reorderLevel).

Admin opens Users page:

Sees pending users.

Approves them:

Sets role = MANAGER or OPERATOR.

Assigns warehouses.

Sets status = ACTIVE.

Result: System is ready. Managers & Operators can log in and work.

5.2 Operator: Receipts (Incoming Stock)

Flow:

Operator logs in (assigned to e.g. Pune).

Goes to Receipts page → clicks “New Receipt”.

Fills:

Warehouse: (Pune only for Operator)

Supplier name

Lines: Cement Bag, location, quantity 200

Saves (status = DRAFT).

After goods are confirmed, clicks Validate:

System:

For each line:

increaseStock(productId, warehouseId, locationId, quantity)

recordMovement type = "RECEIPT", change = +quantity

Set Receipt status = DONE.

Effect:

StockLevel for (Cement, Pune) becomes +200.

Ledger shows +200 entry.

Manager sees quantity 200 in Products view.

5.3 Operator: Deliveries (Outgoing Stock)

Flow:

Operator goes to Deliveries → “New Delivery”.

Chooses:

Warehouse: Pune

Customer name

Lines: Cement Bag 50

Clicks Validate:

System:

For each line:

Calls decreaseStock(...)

If stock would go negative → error "Insufficient stock".

Else recordMovement type = "DELIVERY", change = -quantity

Status = DONE.

Effect:

StockLevel Cement Pune decreases.

Ledger logs -50.

5.4 Operator + Manager: Requisition & Transfer

Requisition (Operator side):

Operator sees low stock in Pune.

Goes to Requisitions → “New Requisition”.

Sets:

requestingWarehouseId = Pune

Lines: Cement Bag 100.

Submits → status = SUBMITTED.

Operator cannot approve; only view status.

Manager Approval & Transfer:

Manager goes to Requisitions page.

Opens SUBMITTED requisition from Pune.

System suggests best source warehouse (e.g., Mumbai) based on stock.

Manager:

Approves → status = APPROVED.

Or rejects → status = REJECTED with reason.

After approval, Manager creates a Transfer:

Source = Mumbai, Target = Pune

Lines: Cement Bag 100.

When stock has actually moved, Manager clicks Validate Transfer:

System:

For each line:

decreaseStock in source (Mumbai)

increaseStock in target (Pune)

recordMovement type = "TRANSFER" with from/to

Transfer status = DONE.

Effect:

Cement stock moves from Mumbai to Pune in the system.

Ledger shows corresponding -100 and +100 entries.

5.5 Adjustments (Fix Stock Mismatches)

Flow:

Operator or Manager notices stock mismatch or damage.

Goes to Adjustments → “New Adjustment”.

Selects:

Warehouse (must be assigned if Operator)

Location

Product

New quantity (e.g. 240 instead of 250)

Reason (damage / count error)

System:

Reads current StockLevel oldQuantity.

Sets newQuantity.

difference = new - old.

Updates StockLevel.

recordMovement type = "ADJUSTMENT", change = difference.

5.6 Products & Quantities View

Products page shows:

name, sku, category, reorderLevel, totalQuantity (from StockLevel).

Quantity is computed via an API joining Product + StockLevel.

Per role:

Admin & Manager:

Can create/edit/deactivate products.

Operator:

Read-only view of products + quantities, no edit.

5.7 Dashboard & Analytics

Dashboard uses:

Product + StockLevel + ReorderLevel

Requisitions, Transfers, Movements

Shows for selected warehouse:

Total products

Low stock items (totalQuantity < reorderLevel)

Count of pending requisitions/transfers

Maybe slow/dead stock, stockouts, etc.

All roles can see dashboard but:

Admin: sees links to configuration (users, warehouses, products).

Manager: sees links to approvals & transfers.

Operator: sees links to receipts/deliveries/requisitions.

5.8 Ledger

Ledger page lists StockMovement:

Date/time

Product

From warehouse/location → To warehouse/location

change (+/-)

type (RECEIPT/DELIVERY/TRANSFER/ADJUSTMENT)

link to source document

Per role:

Admin & Manager: see all movements.

Operator: filtered to assignedWarehouses.

6. Summary for Implementation

Please:

Implement/adjust all models, API routes, and UI pages to follow this entire flow.

Enforce role + warehouse + status checks in backend and UI.

Make sure core flows work:

Admin sets up users/warehouses/products.

Operator receives stock (Receipt) → quantity increases → ledger updates → dashboard updates.

Operator delivers stock (Delivery) → quantity decreases → ledger updates.

Operator raises Requisition → Manager approves → Manager creates & validates Transfer → stock moves between warehouses.

Adjustments correct wrong quantities and appear in ledger.

Manager and Operator both see correct quantities in Products page and Dashboard, according to their permissions.