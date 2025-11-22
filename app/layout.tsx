import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import ChatbotButton from '@/components/ChatbotButton';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StockMaster - Inventory Management System',
  description: 'Multi-warehouse inventory management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <ChatbotButton />
        </Providers>
      </body>
    </html>
  );
}

