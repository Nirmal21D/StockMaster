# Requisition-to-Transfer Flow Analysis

## Intended Flow

1. **Manager A creates Requisition** → Status: `DRAFT`
2. **Manager A (or Operator) submits Requisition** → Status: `SUBMITTED`
3. **Manager B approves Requisition** → Status: `APPROVED` → **Auto-creates Delivery** with status `WAITING`
4. **Manager A accepts Delivery** → Delivery status: `WAITING` → `READY`
5. **Operator at Manager B's warehouse creates Transfer** from `READY` delivery
6. **Operator at Manager B's warehouse dispatches Transfer** → Status: `DRAFT` → `IN_TRANSIT` (stock decremented from source)
7. **Operator at Manager A's warehouse marks Transfer as received** → Status: `IN_TRANSIT` → `DONE` (stock incremented at target)

## Current Implementation Analysis

### ✅ Correctly Implemented

1. **Requisition Creation & Submission**
   - ✅ Manager/Operator can create requisitions
   - ✅ Operator can submit requisitions
   - ✅ Auto-selects Manager's/Operator's warehouse

2. **Requisition Approval**
   - ✅ Only Managers can approve
   - ✅ Manager must select one of their assigned warehouses as source
   - ✅ Auto-creates Delivery with status `WAITING`
   - ✅ Delivery is returned in API response

3. **Delivery Acceptance**
   - ✅ Only Managers can accept deliveries
   - ✅ Manager must be from target warehouse (requesting warehouse)
   - ✅ Status changes: `WAITING` → `READY`

4. **Transfer Creation**
   - ✅ Only Operators can create transfers from deliveries
   - ✅ Operator must be from source warehouse
   - ✅ Only works for `READY` deliveries with `requisitionId`

5. **Transfer Dispatch**
   - ✅ Only Operators at source warehouse can dispatch
   - ✅ Status changes: `DRAFT` → `IN_TRANSIT`
   - ✅ Stock decremented from source warehouse

6. **Transfer Receipt**
   - ✅ Only Operators at target warehouse can receive
   - ✅ Status changes: `IN_TRANSIT` → `DONE`
   - ✅ Stock incremented at target warehouse

### 🔧 Issues Fixed

1. **Delivery Acceptance Warehouse Check**
   - **Issue**: Only checked first assigned warehouse (`assignedWarehouses[0]`)
   - **Fix**: Now checks all assigned warehouses + primary warehouse
   - **File**: `app/api/deliveries/[id]/route.ts`

2. **ObjectId Comparison Issues**
   - **Issue**: Using `includes()` for ObjectId comparison doesn't work reliably
   - **Fix**: Convert both sides to strings before comparison
   - **Files**: 
     - `app/api/deliveries/[id]/route.ts`
     - `app/api/transfers/[id]/route.ts`
     - `app/api/transfers/route.ts`
     - `app/deliveries/[id]/page.tsx`
     - `app/transfers/[id]/page.tsx`

3. **Delivery Auto-Creation Response**
   - **Issue**: Delivery wasn't returned in approval response
   - **Fix**: Delivery is now included in response and frontend uses it immediately
   - **Files**: `app/api/requisitions/[id]/route.ts`, `app/requisitions/[id]/page.tsx`

4. **Admin Permissions**
   - **Issue**: Admin could interfere with requisitions
   - **Fix**: Admin can only view requisitions, not create/approve/reject
   - **Files**: Multiple API routes and UI pages

5. **Requisition-Based Delivery Validation**
   - **Issue**: Requisition-based deliveries could be validated (which decrements stock incorrectly)
   - **Fix**: Validation blocked for requisition-based deliveries; only transfers handle stock
   - **Files**: `app/api/deliveries/[id]/route.ts`

## Flow Verification Checklist

- [x] Manager A creates requisition
- [x] Manager A submits requisition
- [x] Manager B approves requisition → Delivery auto-created
- [x] Manager A accepts delivery → Status becomes READY
- [x] Operator at Manager B's warehouse can create transfer
- [x] Operator at Manager B's warehouse dispatches transfer → Stock decremented
- [x] Operator at Manager A's warehouse receives transfer → Stock incremented
- [x] All warehouse access checks work correctly
- [x] Stock movements are tracked correctly
- [x] Permissions are enforced at each step

## Stock Movement Summary

1. **Requisition Approval**: No stock change (delivery created)
2. **Delivery Acceptance**: No stock change (status update only)
3. **Transfer Dispatch**: Stock **DECREMENTED** from source warehouse
4. **Transfer Receipt**: Stock **INCREMENTED** at target warehouse

## Permission Matrix

| Action | Admin | Manager | Operator |
|--------|-------|---------|----------|
| Create Requisition | ❌ | ✅ | ❌ |
| Submit Requisition | ❌ | ✅ | ❌ | ---- remove the submit (create submits it automatically)
| Approve Requisition | ❌ | ✅ | ❌ |
| Reject Requisition | ❌ | ✅ | ❌ |
| Accept Delivery | ❌ | ❌ |✅ |
| Create Transfer | ❌ | ❌ | ✅ (from source warehouse) |
| Dispatch Transfer | ✅ | ❌ | ✅ (from source warehouse) |
| Receive Transfer | ✅ | ❌ | ✅ (at target warehouse) |

## Notes

- All warehouse ID comparisons now use string conversion for reliability
- Delivery is auto-created and immediately available in UI after approval
- Stock is only moved during transfer dispatch and receipt (not during delivery)
- Managers can view all transfers but cannot edit/delete them