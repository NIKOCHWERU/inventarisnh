'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Boxes, Smartphone } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { withBasePath } from '@/lib/base-path';

interface EmployeeHeaderProps {
  user: {
    id: string;
    name: string;
    role: string;
  };
}

export function EmployeeHeader({ user }: EmployeeHeaderProps) {
  const router = useRouter();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleTemporaryLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Keep device localStorage intact so employee can 1-click restore without QR code
      window.location.href = withBasePath('/portal');
    } catch {
      window.location.href = withBasePath('/portal');
    }
  };

  const handleFullClearLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Clear device localStorage so this phone forgets this employee
      localStorage.removeItem('kantor_device_session_token');
      localStorage.removeItem('kantor_device_user_id');
      localStorage.removeItem('kantor_device_user_name');
      localStorage.removeItem('kantor_device_user');
      window.location.href = withBasePath('/login');
    } catch {
      window.location.href = withBasePath('/login');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#EAE4D9]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* App Logo & Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#B8860B] flex items-center justify-center text-white shadow-sm">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#231F1A] leading-tight">
                Kantor Narasumberhukum
              </h1>
              <p className="text-[10px] text-[#70685C]">Portal Penginput Inventaris</p>
            </div>
          </div>

          {/* User Badge & Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden xs:block">
              <span className="text-xs font-semibold text-[#231F1A] block leading-tight">
                {user.name}
              </span>
              <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#F7F2E4] text-[#7A5805] font-semibold border border-[#E5D7B7]">
                Penginventaris
              </span>
            </div>

            <button
              onClick={() => setIsLogoutModalOpen(true)}
              title="Keluar"
              className="p-2 rounded-lg text-[#70685C] hover:text-[#DC2626] hover:bg-[#FDF2F2] border border-[#EAE4D9] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Opsi Keluar Sesi"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#231F1A]">
            Perangkat ini tercatat aktif atas nama <strong>{user.name}</strong>.
          </p>

          <div className="p-3 rounded-xl bg-[#FAF6EC] border border-[#E5D7B7] space-y-1 text-[#7A5805]">
            <p className="font-semibold flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#B8860B]" />
              Sesi Perangkat Diingat Otomatis
            </p>
            <p className="text-[11px] text-[#70685C] leading-relaxed">
              Anda tidak perlu scan ulang QR code setiap kali membuka inventaris di HP ini.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTemporaryLogout}
              className="w-full text-xs font-semibold justify-center"
            >
              Keluar Sementara (Bisa Masuk 1-Klik)
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleFullClearLogout}
              className="w-full text-xs font-semibold justify-center"
            >
              Hapus Sesi Perangkat (Perlu Scan QR Baru)
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsLogoutModalOpen(false)}
              className="w-full text-xs text-[#70685C] justify-center"
            >
              Batal (Tetap Masuk)
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
