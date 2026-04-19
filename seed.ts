import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seed() {
  try {
    const { adminDb, adminAuth } = await import('./lib/firebase/admin');
    
    console.log('Connecting to Firebase and clearing old data...');

    // Optionally delete old users from Auth to avoid conflicts
    const listUsersResult = await adminAuth.listUsers(1000);
    if (listUsersResult.users.length > 0) {
        await adminAuth.deleteUsers(listUsersResult.users.map(u => u.uid));
        console.log(`Deleted ${listUsersResult.users.length} existing users from Firebase Auth.`);
    }

    // Function to delete all docs in a collection
    const deleteCollection = async (collectionPath: string) => {
        const snapshot = await adminDb.collection(collectionPath).get();
        const batch = adminDb.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Cleared collection: ${collectionPath}`);
    };

    await deleteCollection('users');
    await deleteCollection('warehouses');
    await deleteCollection('locations');
    await deleteCollection('products');
    await deleteCollection('stockLevels');
    await deleteCollection('receipts');
    await deleteCollection('deliveries');
    await deleteCollection('requisitions');
    await deleteCollection('transfers');
    
    console.log('\n--- Creating Data ---');

    // 1. Create Users
    const usersData = [
      {
        email: 'admin@stockmaster.com',
        password: 'password123',
        name: 'Admin User',
        role: 'ADMIN'
      },
      {
        email: 'manager@stockmaster.com',
        password: 'password123',
        name: 'Manager User',
        role: 'MANAGER'
      },
      {
        email: 'operator@stockmaster.com',
        password: 'password123',
        name: 'Operator User',
        role: 'OPERATOR'
      }
    ];

    const userPromises = usersData.map(async (u) => {
      const userRecord = await adminAuth.createUser({
        email: u.email,
        password: u.password,
        displayName: u.name,
      });
      const userDoc = {
        name: u.name,
        email: u.email,
        role: u.role,
        status: 'ACTIVE',
        isActive: true,
        assignedWarehouses: [],
        primaryWarehouseId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await adminDb.collection('users').doc(userRecord.uid).set(userDoc);
      return { id: userRecord.uid, ...u };
    });

    const [admin, manager, operator] = await Promise.all(userPromises);
    console.log('Created Users:', { admin: admin.email, manager: manager.email, operator: operator.email });

    // 2. Create Warehouses
    const warehouse1Ref = await adminDb.collection('warehouses').add({
      name: 'Mumbai Central',
      code: 'WH_MUM',
      location: 'Mumbai, Maharashtra',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const warehouse2Ref = await adminDb.collection('warehouses').add({
      name: 'Pune Store',
      code: 'WH_PUNE',
      location: 'Pune, Maharashtra',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`Created Warehouses: Mumbai(${warehouse1Ref.id}), Pune(${warehouse2Ref.id})`);

    // 3. Create Locations
    const loc1Ref = await adminDb.collection('locations').add({
      warehouseId: warehouse1Ref.id,
      name: 'Rack A - Shelf 1',
      code: 'RACK-A-1',
      description: 'Main storage rack',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const loc2Ref = await adminDb.collection('locations').add({
      warehouseId: warehouse1Ref.id,
      name: 'Rack B - Shelf 2',
      code: 'RACK-B-2',
      description: 'Secondary storage rack',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const loc3Ref = await adminDb.collection('locations').add({
      warehouseId: warehouse2Ref.id,
      name: 'Storage Room 1',
      code: 'ROOM-1',
      description: 'Main storage room',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Created Locations');

    // 4. Create Products
    const productsData = [
      { name: 'Desk', sku: 'DESK001', categoryId: 'Furniture', unit: 'pcs', price: 3000, reorderLevel: 10, abcClass: 'A' },
      { name: 'Table', sku: 'TABLE001', categoryId: 'Furniture', unit: 'pcs', price: 3000, reorderLevel: 15, abcClass: 'A' },
      { name: 'Chair', sku: 'CHAIR001', categoryId: 'Furniture', unit: 'pcs', price: 1500, reorderLevel: 20, abcClass: 'B' },
      { name: 'Lamp', sku: 'LAMP001', categoryId: 'Lighting', unit: 'pcs', price: 500, reorderLevel: 30, abcClass: 'C' },
      { name: 'Monitor', sku: 'MON001', categoryId: 'Electronics', unit: 'pcs', price: 8000, reorderLevel: 5, abcClass: 'A' },
    ];

    const productRefs = [];
    for (const p of productsData) {
      const pRef = await adminDb.collection('products').add({
        ...p,
        description: `High quality ${p.name}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      productRefs.push(pRef);
    }
    console.log(`Created ${productRefs.length} Products`);

    // 5. Create Stock Levels
    const stockLevels = [
      { productId: productRefs[0].id, warehouseId: warehouse1Ref.id, locationId: loc1Ref.id, quantity: 50, updatedAt: new Date() },
      { productId: productRefs[0].id, warehouseId: warehouse2Ref.id, locationId: loc3Ref.id, quantity: 30, updatedAt: new Date() },
      { productId: productRefs[1].id, warehouseId: warehouse1Ref.id, locationId: loc1Ref.id, quantity: 50, updatedAt: new Date() },
      { productId: productRefs[1].id, warehouseId: warehouse2Ref.id, locationId: loc3Ref.id, quantity: 25, updatedAt: new Date() },
      { productId: productRefs[2].id, warehouseId: warehouse1Ref.id, locationId: loc2Ref.id, quantity: 100, updatedAt: new Date() },
      { productId: productRefs[3].id, warehouseId: warehouse1Ref.id, locationId: loc2Ref.id, quantity: 200, updatedAt: new Date() },
      { productId: productRefs[4].id, warehouseId: warehouse1Ref.id, locationId: loc1Ref.id, quantity: 15, updatedAt: new Date() },
    ];

    for (const sl of stockLevels) {
      const stockId = `${sl.productId}_${sl.warehouseId}_${sl.locationId}`;
      await adminDb.collection('stockLevels').doc(stockId).set(sl);
    }
    console.log(`Created ${stockLevels.length} Stock Levels`);

    // 6. Create Receipts (Incoming Stock)
    const receiptsData = [
      {
        receiptNumber: 'REC-2026-001',
        supplierName: 'Furniture Corp',
        warehouseId: warehouse1Ref.id,
        status: 'DONE',
        reference: 'INV-101',
        notes: 'Initial stock intake',
        lines: [
          { productId: productRefs[0].id, locationId: loc1Ref.id, quantity: 50 },
          { productId: productRefs[2].id, locationId: loc2Ref.id, quantity: 100 }
        ],
        createdBy: admin.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const r of receiptsData) {
      await adminDb.collection('receipts').add(r);
    }
    console.log(`Created ${receiptsData.length} Receipts`);

    // 7. Create Deliveries (Outgoing Stock)
    const deliveriesData = [
      {
        deliveryNumber: 'DEL-2026-001',
        customerName: 'Tech Hub Office',
        warehouseId: warehouse1Ref.id,
        status: 'WAITING',
        reference: 'SO-992',
        notes: 'Pending delivery for office setup',
        lines: [
          { productId: productRefs[0].id, fromLocationId: loc1Ref.id, quantity: 5 },
          { productId: productRefs[4].id, fromLocationId: loc1Ref.id, quantity: 2 }
        ],
        createdBy: manager.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const d of deliveriesData) {
      await adminDb.collection('deliveries').add(d);
    }
    console.log(`Created ${deliveriesData.length} Deliveries`);

    // 8. Create Transfers (Location to Location)
    const transfersData = [
      {
        transferNumber: 'TRF-2026-001',
        status: 'DRAFT',
        notes: 'Moving some chairs to Pune',
        sourceWarehouseId: warehouse1Ref.id,
        targetWarehouseId: warehouse2Ref.id,
        lines: [
          { productId: productRefs[2].id, sourceLocationId: loc2Ref.id, targetLocationId: loc3Ref.id, quantity: 20 }
        ],
        createdBy: admin.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const t of transfersData) {
      await adminDb.collection('transfers').add(t);
    }
    console.log(`Created ${transfersData.length} Transfers`);

    // 9. Create Requisitions
    const requisitionsData = [
      {
        requisitionNumber: 'REQ-2026-001',
        status: 'PENDING',
        notes: 'Need more lamps for the showroom',
        requestingWarehouseId: warehouse2Ref.id,
        lines: [
          { productId: productRefs[3].id, quantityRequested: 50 }
        ],
        createdBy: operator.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const req of requisitionsData) {
      await adminDb.collection('requisitions').add(req);
    }
    console.log(`Created ${requisitionsData.length} Requisitions`);

    console.log('\n✅ Seed completed successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin: admin@stockmaster.com / password123');
    console.log('Manager: manager@stockmaster.com / password123');
    console.log('Operator: operator@stockmaster.com / password123');
    
    process.exit(0);

  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();