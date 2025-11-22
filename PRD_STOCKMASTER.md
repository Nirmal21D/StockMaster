📄 Product Requirements Document – StockMaster (Updated)

Version: 2.0
Tech Stack: Next.js, NextAuth, Node.js API Routes, MongoDB, Tailwind CSS
Prepared by: Aditya Makwana
Date: November 2025

1. Introduction
1.1 Product Overview

StockMaster is a multi-warehouse inventory management system that provides:

Real-time visibility of stock across locations

Controlled internal transfers via requisition + approval

Automated stock updates through receipts & deliveries

Analytics to detect low stock, slow/dead stock, frequent stockouts, and best source warehouse

It is designed to be simple to operate for warehouse staff and insightful for managers.

1.2 Objectives

Eliminate manual Excel/WhatsApp-based stock tracking

Reduce stockouts and overstocking

Maintain accurate and auditable stock records

Enable fast internal stock movement with approvals

Provide actionable analytics, not just CRUD screens

2. User Roles & Responsibilities

System supports three roles, all of which can access Dashboard analytics & insight reporting.

Role	Responsibilities
Admin	Manage system configuration, warehouses, locations, users, roles & permissions. Full access to all modules. View Dashboard analytics & insight reporting.
Warehouse Operator	Perform day-to-day operations: create Receipts, Deliveries, Requisitions, and Stock Adjustments. View Dashboard analytics & insight reporting.
Inventory Manager	Review & approve Requisitions, create/validate Internal Transfers, monitor stock KPIs & analytics. View Dashboard analytics & insight reporting.
3. Tech Stack & Architecture
3.1 Frontend

Next.js (App Router)

Tailwind CSS for styling

Client-side pages for:

Dashboard

Products

Receipts

Deliveries

Requisitions

Transfers

Adjustments

Ledger

Settings (Warehouses & Locations)

3.2 Backend

Next.js Route Handlers (API routes) using Node.js

REST-style endpoints under /api/*

Business logic for:

Stock updates

Ledger creation

Validation rules

3.3 Authentication & Authorization

NextAuth for authentication

Credentials or OAuth (e.g., Google) based login

Role stored in user record (e.g. role: 'ADMIN' | 'OPERATOR' | 'MANAGER')

Middleware to protect routes and enforce role-based access

3.4 Database (MongoDB)

Collections (high-level):

users

warehouses

locations

products

stockLevels

receipts, receiptLines (can be embedded or separate)

deliveries, deliveryLines

requisitions, requisitionLines

transfers, transferLines

adjustments

stockMovements (ledger / audit)

4. Core Functional Requirements
4.1 Authentication & User Management

FR-4.1.1 – Login

Users must log in using NextAuth.

On success, redirect to Dashboard based on role.

FR-4.1.2 – Role-based access

Admin can manage users, warehouses, locations.

Warehouse Operator & Inventory Manager can access only allowed modules.

Unauthorized module/route should display “Access Denied”.

FR-4.1.3 – User Management (Admin only)

Admin can:

Create users (email, name, password or invite, role).

Update user role.

Activate/deactivate users.

4.2 Dashboard & Analytics Overview

Purpose: Give all three roles a quick snapshot of inventory health.

FR-4.2.1 – Dashboard Widgets

Total number of Products (SKUs)

Count of Low Stock items (current stock < reorder level)

Pending Requisitions (status: Submitted)

Pending Transfers (status: Draft/In Transit)

Stockout Events in last X days

Slow/Dead Stock count (based on last movement date)

FR-4.2.2 – Warehouse Filter

Dropdown: All / [Warehouse A] / [Warehouse B] / …

All KPIs should refresh based on selected warehouse.

FR-4.2.3 – Drill-down

Clicking on a widget (e.g. “Low Stock Items”) should open a detailed list page with filters.

4.3 Warehouses & Locations (Settings)

FR-4.3.1 – Manage Warehouses (Admin only)

Create, edit, deactivate warehouses. Fields:

name, code, address, description.

FR-4.3.2 – Manage Locations

Under each warehouse, Admin can define locations:

e.g. rack, shelf, bin

Fields: name, warehouseId, optional code/description.

4.4 Product Management

FR-4.4.1 – Product CRUD

Admin can create & edit products:

name, sku, category, unit, reorderLevel, optional price.

FR-4.4.2 – Product Listing

Paginated table with search by sku/name, filter by category, ABC class (when available).

FR-4.4.3 – Per-location Stock View

For each product, show:

warehouse, location, quantity.

Aggregate total available quantity per warehouse.

FR-4.4.4 – Reorder Level

reorderLevel determines “low stock” logic.

4.5 Receipts (Incoming Stock from Supplier)

FR-4.5.1 – Create Receipt (Operator, Admin)
Fields:

supplier name (text for now)

warehouse

optional reference (PO/invoice)

lines: product, location, quantity

FR-4.5.2 – Status Flow

status: 'DRAFT' | 'WAITING' | 'DONE'

FR-4.5.3 – Validate Receipt

Only when status is WAITING or DRAFT.

On validate:

Increment stockLevels for each (product, warehouse, location).

Insert one or more entries into stockMovements.

Set status to DONE.

4.6 Deliveries (Outgoing Stock to Customer)

FR-4.6.1 – Create Delivery (Operator, Admin)
Fields:

customer name (text)

warehouse

lines: product, fromLocation, quantity

FR-4.6.2 – Status Flow

status: 'DRAFT' | 'WAITING' | 'READY' | 'DONE'

FR-4.6.3 – Validate Delivery

On validate:

Check available stock.

Decrement stockLevels.

Insert ledger records in stockMovements.

Set status = 'DONE'.

4.7 Internal Requisitions (Request Stock from Another Warehouse)

FR-4.7.1 – Create Requisition (Operator, Admin)
Fields:

requestingWarehouse

targetWarehouse (preferred source; can be null initially)

lines: product, requiredQuantity, requiredBy (optional date)

status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

FR-4.7.2 – Submit Requisition

Operator can move from DRAFT → SUBMITTED.

FR-4.7.3 – Approve/Reject (Inventory Manager, Admin)

Manager can:

Approve: set status = 'APPROVED'

Reject: set status = 'REJECTED' with reason field.

FR-4.7.4 – Create Transfer from Approved Requisition

On approved requisition, Manager can click “Create Transfer”:

Auto-fill transfer form (sourceWarehouse = chosen warehouse, targetWarehouse = requestingWarehouse, same lines).

Link transfer with requisitionId.

4.8 Internal Transfers (Shifting Module)

FR-4.8.1 – Create Transfer (Manager, Admin)
Fields:

requisitionId (optional but recommended)

sourceWarehouse, targetWarehouse

sourceLocation, targetLocation per line (or common default)

lines: product, quantity

status: 'DRAFT' | 'IN_TRANSIT' | 'DONE'

FR-4.8.2 – Dispatch from Source

When transfer is dispatched:

Option A (simple hackathon version):

Directly move to DONE and update stock.

Option B (if time):

DRAFT → IN_TRANSIT (decrement source only).

On arrival: increment target & set DONE.

FR-4.8.3 – Stock Update on Transfer

For each line:

Decrement stockLevels at sourceWarehouse / sourceLocation.

Increment stockLevels at targetWarehouse / targetLocation.

Ledger entries:

1 movement with negative change from source.

1 movement with positive change for target.

Or single combined movement referencing both.

FR-4.8.4 – Enforce Requisition (Optional Rule)

If configured, system should not allow transfer DONE without a linked APPROVED requisition.

4.9 Stock Adjustments

FR-4.9.1 – Create Adjustment (Operator, Manager, Admin)
Fields:

product

warehouse, location

oldQuantity (system value)

newQuantity (counted value)

difference (auto-calculated)

reason (damage, loss, counting error, etc.)

FR-4.9.2 – On Save

Update stockLevels to newQuantity.

Insert entry into stockMovements.

4.10 Stock Movement Ledger

FR-4.10.1 – Ledger Entries
Each stockMovements doc should contain:

productId

warehouseFrom, warehouseTo (nullable)

locationFrom, locationTo (nullable)

change (+/- quantity)

type: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT'

documentType: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT'

documentId

createdBy (userId)

createdAt

FR-4.10.2 – Ledger UI

Filter by product, warehouse, type, date range.

Columns:

Date, Product, From → To, Change, Type, Document link, User.

5. Analytics & Advanced Features (USPs)

These sit on top of core data (stockLevels, stockMovements) and can be partially implemented depending on time.

5.1 Low-Stock Alerts

FR-5.1.1 – Low Stock List

Endpoint returns products where total available quantity < reorderLevel.

Display on dashboard + separate page.

5.2 Slow-Moving & Dead Stock

FR-5.2.1 – Last Movement Date

For each product & warehouse, compute last stockMovements entry date.

FR-5.2.2 – Category Rules

Active: movement in last 30 days

Slow-moving: no movement for 30–90 days

Dead stock: > 90 days no movement

FR-5.2.3 – UI

“Stock Health” table listing products with category & days since last movement.

5.3 Stockout Frequency

FR-5.3.1 – Stockout Event

Triggered when stockLevels for a product & warehouse go:

from > 0 to = 0

or from above reorderLevel to below.

FR-5.3.2 – Analytics

Count events per product over time window (e.g., last 3 months).

List top N products with highest stockout frequency.

5.4 Best Source Warehouse Suggestion (for Requisitions)

FR-5.4.1 – Suggest Warehouse

When creating a requisition or converting to transfer:

System checks all warehouses’ stockLevels for that product.

Suggests warehouse with highest available quantity as best source.

FR-5.4.2 – UI

On requisition details, show:

“Suggested source: Mumbai Warehouse (120 units available)”

5.5 ABC Classification (Optional/Lightweight)

FR-5.5.1 – Basic ABC

Use approximate annual consumption value (if price given) or movement-count-based proxy.

Mark products as A/B/C in product collection:

A = Top 20% by value/usage

B = Next 30%

C = Remaining

5.6 Future Advanced Analytics (Mention in docs/PPT)

Not required to fully implement in 8 hours, but to mention as roadmap:

ARIMA-based demand forecasting per product/warehouse

Anomaly detection for suspicious movements (large transfers, frequent adjustments, etc.)

6. Non-Functional Requirements
Area	Requirement
Performance	Dashboard API responses < 2–3 seconds for normal dataset
Security	All mutating endpoints behind NextAuth-protected session & role checks
Reliability	Stock update + ledger creation must be atomic per operation
UX	Simple forms, minimal inputs, meaningful statuses
Auditability	All changes in stock must be traceable to a user & document
7. Success Criteria

End-to-end flow works:
Requisition (Pune) → Approval (Manager) → Transfer (Mumbai→Pune) → Stock update → Ledger entry → Dashboard reflects change

Low stock & slow/dead stock lists load correctly.

All three roles see relevant dashboards and are blocked from unauthorized actions.
