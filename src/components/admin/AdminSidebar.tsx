'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  Users,
  QrCode,
  FileSpreadsheet,
  ShoppingCart,
  Settings,
  X,
  ExternalLink,
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Data Inventaris (Aset)', href: '/admin/inventory', icon: Boxes },
    { name: 'Logistik & Stok Kantor', href: '/admin/logistics', icon: ShoppingCart },
    { name: 'Karyawan / Penginput', href: '/admin/employees', icon: Users },
    { name: 'QR Code Karyawan', href: '/admin/qr-code', icon: QrCode },
    { name: 'Laporan & Export', href: '/admin/reports', icon: FileSpreadsheet },
    { name: 'Pengaturan', href: '/admin/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#EAE4D9] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-[#EAE4D9] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#B8860B] flex items-center justify-center text-white shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#231F1A] block leading-tight">
                Inventaris Kantor
              </span>
              <span className="text-[10px] text-[#70685C]">Kantor Narasumberhukum</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#70685C] hover:text-[#231F1A] hover:bg-[#F4F0E8] lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#F7F2E4] text-[#7A5805] border-l-2 border-[#B8860B]'
                    : 'text-[#70685C] hover:bg-[#FAF6EC] hover:text-[#231F1A]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#B8860B] stroke-[2.5]' : 'text-[#C5A059]'
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Portal Quick Access Link */}
        <div className="p-3 border-t border-[#EAE4D9] bg-[#FAF9F5]">
          <Link
            href="/portal"
            target="_blank"
            className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#EAE4D9] text-xs font-medium text-[#231F1A] hover:border-[#B8860B] transition shadow-xs"
          >
            <span className="flex items-center gap-2">
              <QrCode className="w-3.5 h-3.5 text-[#B8860B]" />
              Buka Portal Karyawan
            </span>
            <ExternalLink className="w-3 h-3 text-[#C5A059]" />
          </Link>
        </div>
      </aside>
    </>
  );
}
