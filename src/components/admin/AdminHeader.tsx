'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { withBasePath } from '@/lib/base-path';

interface AdminHeaderProps {
  onMenuToggle: () => void;
  adminName?: string;
}

export function AdminHeader({ onMenuToggle, adminName = 'Administrator' }: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      window.location.href = withBasePath('/login');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-[#EAE4D9] px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-[#70685C] hover:text-[#231F1A] hover:bg-[#F4F0E8] lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-xs text-[#70685C] font-medium hidden sm:inline">
          Kantor Narasumberhukum • Manajemen Inventaris
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#F7F2E4] border border-[#E5D7B7] flex items-center justify-center text-[#7A5805]">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-[#231F1A] block leading-tight">
              {adminName}
            </span>
            <span className="inline-block text-[9px] px-1.5 py-0 bg-[#F7F2E4] text-[#7A5805] font-semibold rounded border border-[#E5D7B7]">
              Admin
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Keluar Akun"
          className="p-2 rounded-lg text-[#70685C] hover:text-[#DC2626] hover:bg-[#FDF2F2] border border-[#EAE4D9] transition-colors ml-2"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
