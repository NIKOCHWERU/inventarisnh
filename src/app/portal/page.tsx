'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmployeeHeader } from '@/components/portal/EmployeeHeader';
import { EmployeeBottomNav } from '@/components/portal/EmployeeBottomNav';
import { InventoryAddForm } from '@/components/portal/InventoryAddForm';
import { InventoryListPortal } from '@/components/portal/InventoryListPortal';
import { LogisticsAddForm } from '@/components/portal/LogisticsAddForm';
import { LogisticsListPortal } from '@/components/portal/LogisticsListPortal';
import {
  Boxes,
  ShoppingCart,
  PlusCircle,
  ClipboardList,
  AlertCircle,
  QrCode,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

type TabType = 'add' | 'list' | 'logistics_add' | 'logistics_list';

export default function EmployeePortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [savedDeviceName, setSavedDeviceName] = useState<string | null>(null);

  async function checkAuth() {
    setIsLoadingUser(true);
    setAuthError(false);
    try {
      // 0. Handle auth_token from URL query (transferred from QR enrollment page)
      let currentToken: string | null = null;
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('auth_token');
        if (urlToken && urlToken.trim()) {
          currentToken = urlToken.trim();
          try {
            localStorage.setItem('kantor_device_session_token', currentToken);
          } catch {}
          // Clean the query string without full reload
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          try {
            currentToken = localStorage.getItem('kantor_device_session_token');
          } catch {}
        }
      }

      // 1. Check existing session via /api/auth/me (passing token header as well for mobile compatibility)
      const headers: Record<string, string> = {};
      if (currentToken) {
        headers['x-session-token'] = currentToken;
      }

      const res = await fetch('/api/auth/me', { headers });
      const data = await res.json();
      if (res.ok && data.authenticated && data.user) {
        setCurrentUser(data.user);
        try {
          localStorage.setItem('kantor_device_user_id', data.user.id);
          localStorage.setItem('kantor_device_user_name', data.user.name);
          localStorage.setItem('kantor_device_user', JSON.stringify(data.user));
          setSavedDeviceName(data.user.name);
        } catch {}
        return;
      }

      // 2. If cookie was not present or expired, attempt auto-restore from device localStorage
      const savedToken = currentToken || (typeof window !== 'undefined' ? localStorage.getItem('kantor_device_session_token') : null);
      const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('kantor_device_user_id') : null;
      const savedName = typeof window !== 'undefined' ? localStorage.getItem('kantor_device_user_name') : null;
      if (savedName) setSavedDeviceName(savedName);

      if (savedToken || savedUserId) {
        const restoreRes = await fetch('/api/auth/restore-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken: savedToken || undefined,
            userId: savedUserId || undefined,
          }),
        });

        const restoreData = await restoreRes.json();
        if (restoreRes.ok && restoreData.success && restoreData.user) {
          setCurrentUser(restoreData.user);
          if (restoreData.sessionToken) {
            try {
              localStorage.setItem('kantor_device_session_token', restoreData.sessionToken);
            } catch {}
          }
          try {
            localStorage.setItem('kantor_device_user_id', restoreData.user.id);
            localStorage.setItem('kantor_device_user_name', restoreData.user.name);
          } catch {}
          setSavedDeviceName(restoreData.user.name);
          return;
        }
      }

      setAuthError(true);
    } catch (err) {
      setAuthError(true);
    } finally {
      setIsLoadingUser(false);
    }
  }

  useEffect(() => {
    try {
      const name = localStorage.getItem('kantor_device_user_name');
      if (name) setSavedDeviceName(name);
    } catch {}
    checkAuth();
  }, []);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#70685C]">Memuat portal karyawan...</p>
        </div>
      </div>
    );
  }

  // If not authenticated (e.g. session expired or direct visit without scanning QR)
  if (authError || !currentUser) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-center items-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#EAE4D9] p-6 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#FEF7E6] border border-[#FBE3B5] text-[#A36B00] flex items-center justify-center mx-auto">
            <QrCode className="w-6 h-6 text-[#B8860B]" />
          </div>

          <div>
            <h2 className="text-base font-bold text-[#231F1A]">
              Sesi Masuk Belum Aktif
            </h2>
            <p className="text-xs text-[#70685C] mt-1.5 leading-relaxed">
              Anda belum terhubung ke sistem inventaris atau perangkat ini belum dihubungkan.
            </p>
          </div>

          {savedDeviceName ? (
            <div className="p-4 bg-[#EBF5ED] rounded-xl border border-[#C2E2CA] text-xs text-[#2B6336] text-left space-y-2.5">
              <div>
                <span className="font-semibold text-[11px] text-[#43794F] block">Akun Penginput Terdeteksi:</span>
                <span className="font-bold text-base text-[#1B4324]">{savedDeviceName}</span>
              </div>
              <p className="text-[11px] text-[#2B6336] leading-relaxed">
                Perangkat Anda telah terdaftar. Tekan tombol di bawah untuk langsung membuka portal tanpa perlu scan ulang.
              </p>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={checkAuth}
                className="w-full text-xs font-bold bg-[#2B6336] hover:bg-[#1E4726] text-white flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Masuk Langsung Sebagai {savedDeviceName}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="p-3.5 bg-[#FAF9F5] rounded-xl border border-[#EAE4D9] text-left text-xs space-y-2 text-[#70685C]">
              <p className="font-semibold text-[#231F1A]">Langkah mudah untuk masuk:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Minta <strong>QR Code Otorisasi</strong> kepada Admin kantor.</li>
                <li>Scan QR Code tersebut menggunakan kamera HP Anda.</li>
                <li>Ketik nama lengkap Anda, dan perangkat ini akan <strong>otomatis mengingat sesi Anda</strong> seterusnya tanpa perlu scan ulang.</li>
              </ol>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            {!savedDeviceName && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={checkAuth}
                className="gap-2 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Coba Muat Ulang Halaman
              </Button>
            )}

            <Link href="/login" className="text-xs text-[#70685C] hover:text-[#B8860B] font-medium pt-1">
              Khusus Admin? Masuk dengan Akun Admin →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isLogistics = activeTab === 'logistics_add' || activeTab === 'logistics_list';
  const isAddMode = activeTab === 'add' || activeTab === 'logistics_add';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F5]">
      {/* Header */}
      <EmployeeHeader user={currentUser} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-3 pb-24 space-y-4">
        {/* Top Primary Segmented Tabs: Aset vs Logistik */}
        <div className="bg-white p-1 rounded-2xl border border-[#EAE4D9] shadow-2xs flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab(isAddMode ? 'add' : 'list')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              !isLogistics
                ? 'bg-[#B8860B] text-white shadow-xs'
                : 'text-[#70685C] hover:bg-[#FAF9F5] hover:text-[#231F1A]'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>📦 Aset Inventaris</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(isAddMode ? 'logistics_add' : 'logistics_list')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              isLogistics
                ? 'bg-[#B8860B] text-white shadow-xs'
                : 'text-[#70685C] hover:bg-[#FAF9F5] hover:text-[#231F1A]'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>🛒 Logistik & Stok</span>
          </button>
        </div>

        {/* Sub-Switch: Tambah vs Daftar */}
        <div className="flex items-center justify-between px-1">
          <div className="inline-flex rounded-lg bg-[#F4F0E8] p-0.5 border border-[#EAE4D9]">
            <button
              type="button"
              onClick={() => setActiveTab(isLogistics ? 'logistics_add' : 'add')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                isAddMode
                  ? 'bg-white text-[#231F1A] shadow-2xs'
                  : 'text-[#70685C] hover:text-[#231F1A]'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#B8860B]" />
              Input Baru
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(isLogistics ? 'logistics_list' : 'list')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                !isAddMode
                  ? 'bg-white text-[#231F1A] shadow-2xs'
                  : 'text-[#70685C] hover:text-[#231F1A]'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-[#B8860B]" />
              Daftar Input Saya
            </button>
          </div>

          <span className="text-[11px] text-[#70685C]">
            {isLogistics ? 'Stok Habis Pakai / Konsumsi' : 'Aset Tetap & Peralatan'}
          </span>
        </div>

        {/* Form or List components */}
        {activeTab === 'add' && <InventoryAddForm currentUser={currentUser} />}
        {activeTab === 'list' && <InventoryListPortal currentUser={currentUser} />}
        {activeTab === 'logistics_add' && <LogisticsAddForm currentUser={currentUser} />}
        {activeTab === 'logistics_list' && <LogisticsListPortal currentUser={currentUser} />}
      </main>

      {/* Fixed Bottom Navigation */}
      <EmployeeBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
