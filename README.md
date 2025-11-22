# StockMaster - Multi-Warehouse Inventory Management System

A comprehensive inventory management system built with Next.js, MongoDB, and NextAuth for managing multi-warehouse stock operations.

## Features

- **Multi-Warehouse Management**: Manage multiple warehouses and locations
- **Stock Operations**: Receipts, Deliveries, Requisitions, Transfers, and Adjustments
- **Role-Based Access Control**: ADMIN, OPERATOR, and MANAGER roles
- **Real-time Stock Tracking**: Automatic stock level updates with ledger entries
- **Analytics Dashboard**: Low stock alerts, slow/dead stock tracking, stockout frequency
- **Audit Trail**: Complete movement history for all stock changes

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **UI Components**: Custom components with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB (local or MongoDB Atlas)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd StockMaster
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/stockmaster
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

4. Seed the database with demo data:
```bash
npm run seed
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Login Credentials

After running the seed script, you can login with:

- **Admin**: `admin@stockmaster.com` / `password123`
- **Operator**: `operator@stockmaster.com` / `password123`
- **Manager**: `manager@stockmaster.com` / `password123`

## Project Structure

```
StockMaster/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── products/          # Products pages
│   ├── receipts/          # Receipts pages
│   ├── deliveries/        # Deliveries pages
│   ├── requisitions/      # Requisitions pages
│   ├── transfers/         # Transfers pages
│   ├── ledger/            # Move history page
│   └── settings/          # Settings page
├── components/            # React components
├── lib/                   # Utilities and models
│   ├── models/           # Mongoose models
│   ├── services/         # Business logic services
│   └── utils.ts          # Helper functions
├── scripts/               # Utility scripts
│   └── seed.ts           # Database seed script
└── public/                # Static assets
```

## User Roles & Permissions

### ADMIN
- Full system access
- Manage users, warehouses, locations
- All operational modules

### OPERATOR
- Create and manage Receipts, Deliveries, Requisitions
- Create Stock Adjustments
- View Dashboard and Analytics

### MANAGER
- Approve/Reject Requisitions
- Create and validate Transfers
- Monitor KPIs and Analytics

## Core Workflows

### Receipt Flow
1. Create receipt (DRAFT)
2. Add products and quantities
3. Validate receipt → Updates stock levels and creates ledger entries

### Delivery Flow
1. Create delivery (DRAFT)
2. Add products and quantities
3. Check stock availability
4. Validate delivery → Decrements stock and creates ledger entries

### Requisition → Transfer Flow
1. Operator creates requisition (DRAFT)
2. Submit requisition (SUBMITTED)
3. Manager approves requisition (APPROVED)
4. Manager creates transfer from approved requisition
5. Validate transfer → Moves stock between warehouses

## API Endpoints

- `/api/products` - Product CRUD
- `/api/warehouses` - Warehouse management
- `/api/locations` - Location management
- `/api/receipts` - Receipt operations
- `/api/deliveries` - Delivery operations
- `/api/requisitions` - Requisition operations
- `/api/transfers` - Transfer operations
- `/api/adjustments` - Stock adjustments
- `/api/ledger` - Stock movement history
- `/api/dashboard` - Dashboard KPIs
- `/api/analytics/*` - Analytics endpoints

## Database Schema

The system uses MongoDB with the following main collections:
- `users` - User accounts and roles
- `warehouses` - Warehouse information
- `locations` - Location details within warehouses
- `products` - Product catalog
- `stockLevels` - Current stock quantities
- `receipts` - Incoming stock records
- `deliveries` - Outgoing stock records
- `requisitions` - Internal stock requests
- `transfers` - Inter-warehouse transfers
- `adjustments` - Stock adjustments
- `stockMovements` - Audit trail ledger

## Development

### Running in Development Mode
```bash
npm run dev
```

### Building for Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## License

This project is created for hackathon/demo purposes.

## Support

For issues or questions, please refer to the PRD and schema documentation files in the repository.

# StockMaster
