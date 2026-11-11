'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Boxes, ArrowRight, AlertCircle, CheckCircle2, User, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { withBasePath } from '@/lib/base-path';

export const dynamic = 'force-dynamic';

function EnrollContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [name, setName] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setTokenError('Tautan QR Code tidak memiliki token enrollment.');
        setIsValidating(false);
        return;
      }

      try {
        const res = await fetch(`/api/enroll/validate?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setIsValidToken(true);
        } else {
          setTokenError(data.error || 'Token QR Code tidak valid atau sudah kedaluwarsa.');
        }
      } catch (err) {
        setTokenError('Gagal memverifikasi token ke server.');
      } finally {
        setIsValidating(false);
      }
    }

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama Lengkap wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/enroll/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: name.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal melakukan pendaftaran.');
      }

      // Persist session token and employee data on this device's localStorage
      if (data.sessionToken) {
        try {
          localStorage.setItem('kantor_device_session_token', data.sessionToken);
          localStorage.setItem('kantor_device_user_id', data.user.id);
          localStorage.setItem('kantor_device_user_name', data.user.name);
          localStorage.setItem('kantor_device_user', JSON.stringify(data.user));
        } catch (e) {
          console.error('Failed to save session to device localStorage:', e);
        }
      }

      // Redirect immediately to Employee Inventory Portal with auth token handoff
      if (data.sessionToken) {
        window.location.href = withBasePath(`/portal?auth_token=${encodeURIComponent(data.sessionToken)}`);
      } else {
        window.location.href = withBasePath('/portal');
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* App Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#B8860B] items-center justify-center text-white shadow-md mb-3">
            <Boxes className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#231F1A]">
            Kantor Narasumberhukum
          </h1>
          <p className="text-xs text-[#70685C] mt-1">
            Portal Input Inventaris Karyawan
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl border border-[#EAE4D9] shadow-sm p-6 sm:p-8">
          {isValidating ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#70685C]">
                Memverifikasi QR Code otorisasi...
              </p>
            </div>
          ) : !isValidToken ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#FDF2F2] border border-[#F8C4C4] text-[#C53030] flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#231F1A]">
                  QR Code Tidak Dapat Digunakan
                </h3>
                <p className="text-xs text-[#C53030] mt-1 px-2">
                  {tokenError}
                </p>
              </div>
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#EAE4D9] text-left text-xs text-[#70685C]">
                <p className="font-medium text-[#231F1A] mb-1">Kemungkinan penyebab:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>QR Code sudah pernah dipakai oleh karyawan lain.</li>
                  <li>Masa berlaku QR Code telah habis (kedaluwarsa).</li>
                  <li>QR Code dinonaktifkan oleh administrator.</li>
                </ul>
                <p className="mt-2 text-[#B8860B] font-medium">
                  Silakan hubungi administrator kantor untuk membuat QR Code baru.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-5 pb-4 border-b border-[#EAE4D9]">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F7F2E4] text-[#7A5805] border border-[#E5D7B7] text-xs font-semibold mb-2">
                  <ShieldCheck className="w-4 h-4 text-[#B8860B]" />
                  QR Code Terverifikasi
                </div>
                <h2 className="text-lg font-bold text-[#231F1A]">
                  Registrasi Penginput
                </h2>
                <p className="text-xs text-[#70685C] mt-1">
                  Masukkan nama lengkap Anda untuk memulai pencatatan barang inventaris kantor. Tidak memerlukan password.
                </p>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-[#FDF2F2] border border-[#F8C4C4] text-xs text-[#C53030] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#231F1A] mb-1.5">
                    Nama Lengkap Anda <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#C5A059] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Masukkan nama lengkap karyawan..."
                      autoFocus
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#EAE4D9] text-sm text-[#231F1A] placeholder-[#C5A059]/60 focus:outline-none focus:ring-2 focus:ring-[#B8860B] focus:border-transparent transition"
                    />
                  </div>
                  <p className="text-[11px] text-[#70685C] mt-1">
                    Nama ini akan tercatat otomatis sebagai penginput barang.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 shadow-sm font-semibold"
                  >
                    <span>Mulai Input Inventaris</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-[#70685C]">
          Kantor Narasumberhukum &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}

export default function EnrollPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#70685C]">Memuat pendaftaran...</p>
          </div>
        </div>
      }
    >
      <EnrollContent />
    </Suspense>
  );
}
