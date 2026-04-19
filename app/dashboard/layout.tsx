'use client';

import { motion } from 'framer-motion';
import { useSession } from '@/components/AuthProvider';
import { redirect } from 'next/navigation';
import { TopBar } from '@/components/TopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex flex-col">
      <TopBar />
      <main className="flex-1 p-6 overflow-auto">
        <motion.div
          key="dashboard-content"
          initial={{ opacity: 0, scale: 0.99, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
