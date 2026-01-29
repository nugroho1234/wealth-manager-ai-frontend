import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { GamificationProvider } from '@/contexts/GamificationContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wealth Manager AI - Insurance Comparison Platform',
  description: 'Professional insurance comparison and proposal generator for agents and advisors',
  keywords: 'insurance, comparison, proposals, agents, advisors, wealth management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <NotificationProvider>
            <GamificationProvider>
              <ToastProvider>
                {children}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#fff',
                      color: '#374151',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    },
                    success: {
                      style: {
                        border: '1px solid #10b981',
                      },
                    },
                    error: {
                      style: {
                        border: '1px solid #ef4444',
                      },
                    },
                  }}
                />
              </ToastProvider>
            </GamificationProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}