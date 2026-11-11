'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function verifyAdmin() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.authenticated || !data.user || data.user.role !== 'Admin') {
          router.push('/login');
          return;
        }
        setAdminUser(data.user);
      } catch {
        router.push('/login');
      } finally {
        setIsChecking(false);
      }
    }
    verifyAdmin();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#70685C]">Memuat dashboard administrator...</p>
        </div>
      </div>
    );
  }

  if (!adminUser) return null;

  return (
    <div className="min-h-screen flex bg-[#FAF9F5]">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <AdminHeader
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          adminName={adminUser.name}
        />

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
