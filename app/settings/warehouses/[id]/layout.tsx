import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TopBar } from '@/components/TopBar';

export default async function WarehouseDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  // Allow all authenticated users to view warehouse details (read-only for non-admins)
  // Role-based UI controls are handled in the page component

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex flex-col">
      <TopBar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}

