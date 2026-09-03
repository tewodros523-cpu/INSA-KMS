import React from 'react';
import './globals.css';
import { AuthProvider } from '@/src/lib/auth-context';
import { DiscussionWidget } from '@/src/components/DiscussionWidget/DiscussionWidget';

export const metadata = {
  title: 'INSA Knowledge Management System — INSA KMS',
  description: 'Official INSA Enterprise Knowledge Management System & Document Repository',
  icons: {
    icon: '/images/insalogo.png',
    shortcut: '/images/insalogo.png',
    apple: '/images/insalogo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 font-sans text-slate-900 antialiased">
        <AuthProvider>
          {children}
          <DiscussionWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
