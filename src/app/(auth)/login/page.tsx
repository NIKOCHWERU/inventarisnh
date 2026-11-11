'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, Lock, User, AlertCircle, ArrowRight, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { withBasePath } from '@/lib/base-path';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedEmployee, setSavedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    try {
      const name = localStorage.getItem('kantor_device_user_name');
      const id = localStorage.getItem('kantor_device_user_id');
      if (name && id) {
        setSavedEmployee({ id, name });
      }
    } catch {}
  }, []);

  const handleRestoreEmployee = async () => {
    setIsRestoring(true);
    try {
      const token = localStorage.getItem('kantor_device_session_token');
      const userId = localStorage.getItem('kantor_device_user_id');
      const res = await fetch('/api/auth/restore-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token || undefined, userId: userId || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = withBasePath('/portal');
        return;
      }
    } catch (e) {
      console.error(e);
    }
    setIsRestoring(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login gagal.');
      }

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo and title */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#B8860B] items-center justify-center text-white shadow-md mb-3">
            <Boxes className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#231F1A]">
            Inventaris Kantor
          </h1>
          <p className="text-xs text-[#70685C] mt-1">
            Kantor Narasumberhukum • Administrator
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-[#EAE4D9] shadow-sm p-6 sm:p-8">
          {savedEmployee && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FAF6EC] border border-[#E5D7B7] text-left">
              <div className="flex items-center gap-1.5 mb-1">
                <Smartphone className="w-4 h-4 text-[#B8860B]" />
                <span className="text-xs font-bold text-[#7A5805]">Perangkat Karyawan Terdaftar</span>
              </div>
              <p className="text-xs text-[#231F1A]">
                Perangkat ini tercatat atas nama <strong>{savedEmployee.name}</strong>.
              </p>
              <button
                type="button"
                onClick={handleRestoreEmployee}
                disabled={isRestoring}
                className="mt-2.5 w-full py-2 px-3 rounded-lg bg-[#B8860B] hover:bg-[#996D07] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{isRestoring ? 'Menghubungkan Sesi...' : `Masuk Sebagai ${savedEmployee.name}`}</span>
              </button>
              <div className="mt-2 text-center">
                <span className="text-[10px] text-[#70685C]">
                  Atau masuk sebagai Admin dengan formulir di bawah:
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#FDF2F2] border border-[#F8C4C4] text-xs text-[#C53030] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#231F1A] mb-1.5">
                Username Administrator
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#C5A059] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#EAE4D9] text-sm text-[#231F1A] placeholder-[#C5A059]/60 focus:outline-none focus:ring-2 focus:ring-[#B8860B] focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#231F1A] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#C5A059] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#EAE4D9] text-sm text-[#231F1A] placeholder-[#C5A059]/60 focus:outline-none focus:ring-2 focus:ring-[#B8860B] focus:border-transparent transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 shadow-sm font-semibold"
              >
                <span>Masuk ke Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-[#EAE4D9] text-center">
            <p className="text-[11px] text-[#70685C]">
              Untuk karyawan / penginput, silakan scan <strong>QR Code Otorisasi</strong> yang disediakan oleh administrator kantor.
            </p>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-[#70685C]">
          Kantor Narasumberhukum &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
