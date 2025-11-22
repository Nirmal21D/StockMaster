import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { getDashboardData } from '@/lib/services/dashboardService';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  try {
    const dashboardData = await getDashboardData();
    return <DashboardClient initialData={dashboardData} />;
  } catch (error: any) {
    console.error('Dashboard error:', error);
    // Return empty data on error so page still loads
    return (
      <DashboardClient
        initialData={{
          totalSKUs: 0,
          lowStockCount: 0,
          pendingRequisitions: 0,
          pendingTransfers: 0,
          slowDeadStockCount: 0,
          stockoutEvents: 0,
        }}
      />
    );
  }
}

