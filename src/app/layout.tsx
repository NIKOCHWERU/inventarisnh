import type { Metadata } from 'next';
import './globals.css';
import { BasePathProvider } from '@/components/providers/BasePathProvider';

export const metadata: Metadata = {
  title: 'Sistem Inventaris - Kantor Narasumberhukum',
  description: 'Aplikasi Manajemen Inventaris Kantor Narasumberhukum dengan Portal Karyawan QR Code',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#FAF9F5] text-[#231F1A] flex flex-col font-sans">
        <BasePathProvider>
          {children}
        </BasePathProvider>
      </body>
    </html>
  );
}
