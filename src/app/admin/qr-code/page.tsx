'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Plus,
  Download,
  Copy,
  Check,
  Globe,
  Wifi,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

export default function AdminQrCodePage() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Network info
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  // New QR Generation states
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [expiryHours, setExpiryHours] = useState('24');
  const [selectedBaseUrl, setSelectedBaseUrl] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdTokenResult, setCreatedTokenResult] = useState<any | null>(null);

  // Active QR focus view
  const [copiedLink, setCopiedLink] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/qr-tokens');
      const data = await res.json();
      if (data.tokens) {
        setTokens(data.tokens);
      }

      // Also get network info
      const sRes = await fetch('/api/settings');
      const sData = await sRes.json();
      if (sData.network) {
        setNetworkInfo(sData.network);

        // Always prioritize Public Domain (appUrl), Tunnel URL, or Wi-Fi LAN IP, NEVER localhost!
        let defaultBase = sData.network.appUrl || sData.network.tunnelUrl || sData.network.lanUrl;
        if (!defaultBase || defaultBase.includes('localhost') || defaultBase.includes('127.0.0.1')) {
          defaultBase = sData.network.lanUrl || `http://${sData.network.localIps?.[0] || '192.168.1.100'}:3000`;
        }

        if (!selectedBaseUrl) {
          setSelectedBaseUrl(defaultBase);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateToken = async () => {
    setIsGenerating(true);
    try {
      let baseUrlToUse = selectedBaseUrl;
      if (selectedBaseUrl === 'custom') {
        baseUrlToUse = customUrlInput.trim();
      }

      const res = await fetch('/api/qr-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiryHours: parseInt(expiryHours, 10),
          baseUrl: baseUrlToUse || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.tokenRecord) {
        setCreatedTokenResult(data.tokenRecord);
        setIsGenerateModalOpen(false);
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Switch Base URL for the currently active QR Code on the fly
  const switchActiveQrDomain = async (newBaseDomain: string) => {
    if (!createdTokenResult) return;
    try {
      const cleanBase = newBaseDomain.replace(/\/$/, '');
      const newTargetUrl = `${cleanBase}/enroll?token=${createdTokenResult.plainToken}`;

      const newQrDataUrl = await QRCode.toDataURL(newTargetUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 480,
        color: {
          dark: '#231F1A',
          light: '#FFFFFF',
        },
      });

      setCreatedTokenResult((prev: any) => ({
        ...prev,
        targetUrl: newTargetUrl,
        qrDataUrl: newQrDataUrl,
      }));
    } catch (err) {
      console.error('Failed to regenerate QR code:', err);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await fetch(`/api/qr-tokens/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/qr-tokens/${id}`, { method: 'DELETE' });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const downloadQrImage = (dataUrl: string, filename = 'QR_Inventaris_Kantor.png') => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE4D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#231F1A]">
            Sistem QR Code Karyawan
          </h1>
          <p className="text-xs text-[#70685C] mt-1">
            Buat dan kelola QR Code otorisasi untuk karyawan melakukan pendaftaran dan input inventaris kantor melalui smartphone.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            // Default to LAN Wi-Fi IP or Tunnel URL
            const bestUrl = networkInfo?.tunnelUrl || networkInfo?.lanUrl;
            if (bestUrl) setSelectedBaseUrl(bestUrl);
            setIsGenerateModalOpen(true);
          }}
          className="gap-2 shadow-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          + Buat QR Code Penginput
        </Button>
      </div>

      {/* Network Access Banner */}
      <div className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#231F1A] flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-[#B8860B]" />
            Status Jaringan & Akses Perangkat HP
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="h-7 text-xs gap-1 text-[#70685C]"
          >
            <RefreshCw className="w-3 h-3" /> Periksa Koneksi
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* LAN Wi-Fi */}
          <div className="p-3 rounded-lg border border-[#C2E2CA] bg-[#EBF5ED] flex items-start gap-2.5">
            <Wifi className="w-4 h-4 text-[#2B6336] mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#2B6336]">
                  Wi-Fi Kantor (IP LAN)
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#2B6336] text-white font-medium">
                  Rekomendasi HP
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-[#231F1A] mt-0.5">
                {networkInfo?.lanUrl || 'http://192.168.1.100:3000'}
              </p>
              <span className="text-[10px] text-[#426F4A] block mt-0.5">
                Gunakan URL ini di QR Code agar HP karyawan yang terhubung ke Wi-Fi kantor dapat membuka portal langsung!
              </span>
            </div>
          </div>

          {/* Cloudflare Tunnel */}
          <div className="p-3 rounded-lg border border-[#EAE4D9] bg-[#FAF9F5] flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-[#2563EB] mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#231F1A]">
                  Tunnel Publik (Ngrok / Cloudflare)
                </span>
                {networkInfo?.tunnelUrl ? (
                  <Badge variant="baik" className="text-[9px] py-0">
                    Aktif
                  </Badge>
                ) : (
                  <Badge variant="inactive" className="text-[9px] py-0">
                    Belum Dijalankan
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-[#231F1A] font-mono mt-0.5 break-all">
                {networkInfo?.tunnelUrl || 'Jalankan `npm run ngrok` atau `npm run tunnel`'}
              </p>
              <span className="text-[10px] text-[#70685C]">
                Dapat diakses HP karyawan dari mana saja (paket data seluler 4G/5G).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Token Showcase (Big QR Display) */}
      {createdTokenResult && (
        <div className="bg-[#EBF5ED] border border-[#C2E2CA] rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2B6336]" />
              <div>
                <h3 className="text-base font-bold text-[#2B6336]">
                  QR Code Penginput Berhasil Dibuat!
                </h3>
                <p className="text-xs text-[#2B6336]">
                  Siap di-scan oleh smartphone karyawan di jaringan yang sama.
                </p>
              </div>
            </div>
            <Badge variant="baik">Aktif & Siap Digunakan</Badge>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-5 rounded-xl border border-[#C2E2CA]">
            {/* Big QR Display */}
            <div className="p-3 bg-white border border-[#EAE4D9] rounded-xl shadow-xs flex-shrink-0 text-center">
              <img
                src={createdTokenResult.qrDataUrl}
                alt="QR Code Enrollment"
                className="w-56 h-56 object-contain mx-auto"
              />
              <span className="text-[10px] text-[#70685C] mt-1.5 block font-medium">
                Pindai dengan kamera smartphone
              </span>
            </div>

            {/* Info and Actions */}
            <div className="space-y-3 flex-1 text-xs">
              {/* Target URL with warning check */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#70685C] font-semibold">URL Pendaftaran di QR:</span>
                  {createdTokenResult.targetUrl.includes('localhost') ? (
                    <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      HP TIDAK bisa akses localhost! Ganti ke IP di bawah:
                    </span>
                  ) : (
                    <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Format IP Valid untuk HP
                    </span>
                  )}
                </div>

                <span className="font-mono text-xs text-[#231F1A] bg-[#FAF9F5] p-2.5 rounded-lg border border-[#EAE4D9] block break-all select-all font-semibold">
                  {createdTokenResult.targetUrl}
                </span>
              </div>

              {/* Quick 1-Click Domain Switcher */}
              <div className="p-2.5 rounded-lg bg-[#F4F0E8] border border-[#EAE4D9] space-y-1.5">
                <span className="text-[11px] font-semibold text-[#231F1A] flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-[#B8860B]" />
                  Ganti Alamat URL pada QR Code ini (1-Klik):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {networkInfo?.appUrl && (
                    <button
                      type="button"
                      onClick={() => switchActiveQrDomain(networkInfo.appUrl)}
                      className="px-2.5 py-1 rounded bg-[#B8860B] text-white border border-[#996D07] text-xs font-semibold hover:bg-[#996D07] transition shadow-2xs"
                    >
                      🌐 Domain Publik ({networkInfo.appUrl.replace('https://', '').replace('http://', '')})
                    </button>
                  )}

                  {networkInfo?.lanUrl && (
                    <button
                      type="button"
                      onClick={() => switchActiveQrDomain(networkInfo.lanUrl)}
                      className="px-2.5 py-1 rounded bg-white border border-[#C2E2CA] text-xs font-semibold text-[#2B6336] hover:bg-[#EBF5ED] transition shadow-2xs"
                    >
                      📡 Pakai IP Wi-Fi ({networkInfo.lanUrl.replace('http://', '')})
                    </button>
                  )}

                  {networkInfo?.ipDetails?.map((ip: any) => {
                    const url = `http://${ip.address}:3000`;
                    if (url === networkInfo?.lanUrl) return null;
                    return (
                      <button
                        key={ip.address}
                        type="button"
                        onClick={() => switchActiveQrDomain(url)}
                        className="px-2 py-1 rounded bg-white border border-[#EAE4D9] text-[11px] text-[#70685C] hover:bg-[#FAF9F5] transition"
                      >
                        {ip.name}: {ip.address}
                      </button>
                    );
                  })}

                  {networkInfo?.tunnelUrl && (
                    <button
                      type="button"
                      onClick={() => switchActiveQrDomain(networkInfo.tunnelUrl)}
                      className="px-2.5 py-1 rounded bg-white border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition shadow-2xs"
                    >
                      🌐 Pakai Cloudflare Tunnel
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[#70685C] block">Masa Berlaku Hingga:</span>
                  <span className="font-semibold text-[#231F1A]">
                    {new Date(createdTokenResult.expiresAt).toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-[#70685C] block">Sifat Penggunaan:</span>
                  <span className="font-semibold text-[#2B6336]">
                    1x Pendaftaran (Sesi tersimpan di HP tanpa perlu scan ulang)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => downloadQrImage(createdTokenResult.qrDataUrl)}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Unduh Gambar QR Code
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => copyToClipboard(createdTokenResult.targetUrl)}
                  className="gap-1.5 text-xs font-semibold"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copiedLink ? 'Tersalin!' : 'Salin Tautan'}
                </Button>

                <a
                  href={createdTokenResult.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B8860B] hover:underline px-3 py-2"
                >
                  Buka Halaman Registrasi <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Table of QR Codes */}
      <div className="bg-white rounded-xl border border-[#EAE4D9] shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAE4D9] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#231F1A]">
              Riwayat Token & QR Code
            </h3>
            <p className="text-[11px] text-[#70685C]">
              Daftar seluruh QR enrollment yang pernah dibuat oleh admin
            </p>
          </div>
          <span className="text-xs text-[#70685C] font-semibold">
            {tokens.length} Token Tercatat
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF9F5] border-b border-[#EAE4D9] text-[#70685C] font-semibold">
                <th className="py-3 px-4">Token ID</th>
                <th className="py-3 px-3">Dibuat Oleh</th>
                <th className="py-3 px-3">Tanggal Dibuat</th>
                <th className="py-3 px-3">Kedaluwarsa</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Digunakan Oleh</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D9]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#70685C]">
                    Memuat riwayat QR Code...
                  </td>
                </tr>
              ) : tokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#70685C]">
                    Belum ada QR Code yang dibuat. Klik tombol <strong>+ Buat QR Code Penginput</strong> di atas.
                  </td>
                </tr>
              ) : (
                tokens.map((t) => {
                  let badgeVariant: any = 'default';
                  let statusText = t.status;
                  if (t.status === 'ACTIVE') {
                    badgeVariant = 'active';
                    statusText = 'Aktif';
                  } else if (t.status === 'USED') {
                    badgeVariant = 'used';
                    statusText = 'Telah Digunakan';
                  } else if (t.status === 'REVOKED') {
                    badgeVariant = 'revoked';
                    statusText = 'Dinonaktifkan';
                  } else if (t.status === 'EXPIRED') {
                    badgeVariant = 'inactive';
                    statusText = 'Kedaluwarsa';
                  }

                  return (
                    <tr key={t.id} className="hover:bg-[#FAF9F5] transition-colors">
                      <td className="py-3 px-4 font-mono text-[#70685C]">
                        {t.id.slice(0, 10)}...
                      </td>
                      <td className="py-3 px-3 font-medium text-[#231F1A]">
                        {t.creatorName}
                      </td>
                      <td className="py-3 px-3 text-[#70685C]">
                        {new Date(t.createdAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 text-[#70685C]">
                        {new Date(t.expiresAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={badgeVariant}>{statusText}</Badge>
                      </td>
                      <td className="py-3 px-3">
                        {t.usedByName ? (
                          <span className="font-semibold text-[#2B6336]">
                            {t.usedByName}
                          </span>
                        ) : (
                          <span className="text-[#C5A059] italic">Belum digunakan</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {t.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleRevoke(t.id)}
                              title="Nonaktifkan Token Ini"
                              className="p-1.5 text-[#70685C] hover:text-red-600 hover:bg-red-50 rounded-md transition"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(t.id)}
                            title="Hapus Rekaman Token"
                            className="p-1.5 text-[#70685C] hover:text-red-600 hover:bg-red-50 rounded-md transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GENERATE QR CODE MODAL */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Buat QR Code Penginput Baru"
        description="Pilih alamat IP yang dapat dijangkau oleh smartphone karyawan."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Expiry selection */}
          <div>
            <label className="block font-semibold text-[#231F1A] mb-1.5">
              Masa Berlaku QR Code
            </label>
            <select
              value={expiryHours}
              onChange={(e) => setExpiryHours(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:ring-1 focus:ring-[#B8860B]"
            >
              <option value="1">1 Jam</option>
              <option value="6">6 Jam</option>
              <option value="12">12 Jam</option>
              <option value="24">24 Jam (1 Hari - Disarankan)</option>
              <option value="72">3 Hari</option>
              <option value="168">7 Hari (1 Minggu)</option>
              <option value="720">30 Hari (1 Bulan)</option>
            </select>
            <span className="text-[11px] text-[#70685C] mt-1 block">
              💡 <em>Catatan:</em> Masa berlaku ini hanya batas waktu scan awal. Begitu karyawan mendaftar sekali, sesi login akan otomatis disimpan di HP masing-masing hingga 1 tahun tanpa perlu scan ulang.
            </span>
          </div>

          {/* Base URL selector with clear IP options */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-semibold text-[#231F1A]">
                Pilih Alamat IP / Host untuk QR Code:
              </label>
              <span className="text-[11px] text-[#2B6336] font-medium">
                Pilih IP agar bisa di-scan HP
              </span>
            </div>

            <div className="space-y-2">
              {/* Option 0: Public Domain (Official Website) */}
              {networkInfo?.appUrl && (
                <label
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                    selectedBaseUrl === networkInfo.appUrl
                      ? 'border-[#B8860B] bg-[#FAF6EC]'
                      : 'border-[#EAE4D9] bg-[#FAF9F5] hover:border-[#C5A059]'
                  }`}
                >
                  <input
                    type="radio"
                    name="baseUrlChoice"
                    checked={selectedBaseUrl === networkInfo.appUrl}
                    onChange={() => setSelectedBaseUrl(networkInfo.appUrl)}
                    className="mt-0.5 text-[#B8860B] focus:ring-[#B8860B]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#231F1A]">
                        🌐 Domain Publik Resmi
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#B8860B] text-white font-semibold">
                        Domain Kantor
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#231F1A] font-semibold block mt-0.5">
                      {networkInfo.appUrl}
                    </span>
                    <span className="text-[11px] text-[#70685C] block mt-0.5">
                      Bisa di-scan dari HP mana saja (termasuk paket data seluler tanpa harus terhubung ke Wi-Fi).
                    </span>
                  </div>
                </label>
              )}

              {/* Option 1: Primary Wi-Fi LAN IP */}
              {networkInfo?.lanUrl && (
                <label
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                    selectedBaseUrl === networkInfo.lanUrl
                      ? 'border-[#B8860B] bg-[#EBF5ED]'
                      : 'border-[#EAE4D9] bg-[#FAF9F5] hover:border-[#C5A059]'
                  }`}
                >
                  <input
                    type="radio"
                    name="baseUrlChoice"
                    checked={selectedBaseUrl === networkInfo.lanUrl}
                    onChange={() => setSelectedBaseUrl(networkInfo.lanUrl)}
                    className="mt-0.5 text-[#B8860B] focus:ring-[#B8860B]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#231F1A]">
                        📡 IP Wi-Fi Kantor (LAN)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#2B6336] text-white font-semibold">
                        Sangat Disarankan untuk HP
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#231F1A] font-semibold block mt-0.5">
                      {networkInfo.lanUrl}
                    </span>
                    <span className="text-[11px] text-[#70685C] block mt-0.5">
                      HP karyawan yang terhubung ke Wi-Fi kantor dapat langsung memindai dan membuka portal pendaftaran.
                    </span>
                  </div>
                </label>
              )}

              {/* Other detected interface IPs */}
              {networkInfo?.ipDetails?.map((ip: any) => {
                const ifUrl = `http://${ip.address}:3000`;
                if (ifUrl === networkInfo?.lanUrl) return null;
                return (
                  <label
                    key={ip.address}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                      selectedBaseUrl === ifUrl
                        ? 'border-[#B8860B] bg-[#F7F2E4]'
                        : 'border-[#EAE4D9] bg-[#FAF9F5] hover:border-[#C5A059]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="baseUrlChoice"
                      checked={selectedBaseUrl === ifUrl}
                      onChange={() => setSelectedBaseUrl(ifUrl)}
                      className="mt-0.5 text-[#B8860B] focus:ring-[#B8860B]"
                    />
                    <div>
                      <span className="font-semibold text-[#231F1A] block">
                        Jaringan {ip.name}
                      </span>
                      <span className="font-mono text-xs text-[#70685C]">
                        {ifUrl}
                      </span>
                    </div>
                  </label>
                );
              })}

              {/* Cloudflare Tunnel Option if active */}
              {networkInfo?.tunnelUrl && (
                <label
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                    selectedBaseUrl === networkInfo.tunnelUrl
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-[#EAE4D9] bg-[#FAF9F5] hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="baseUrlChoice"
                    checked={selectedBaseUrl === networkInfo.tunnelUrl}
                    onChange={() => setSelectedBaseUrl(networkInfo.tunnelUrl)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#231F1A]">
                        🌐 Cloudflare Tunnel (HTTPS Publik)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-blue-600 text-white font-semibold">
                        Bisa Di-scan dari Paket Data HP
                      </span>
                    </div>
                    <span className="font-mono text-xs text-blue-900 font-semibold block mt-0.5">
                      {networkInfo.tunnelUrl}
                    </span>
                  </div>
                </label>
              )}

              {/* Custom IP input option */}
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  selectedBaseUrl === 'custom'
                    ? 'border-[#B8860B] bg-[#F7F2E4]'
                    : 'border-[#EAE4D9] bg-[#FAF9F5] hover:border-[#C5A059]'
                }`}
              >
                <input
                  type="radio"
                  name="baseUrlChoice"
                  checked={selectedBaseUrl === 'custom'}
                  onChange={() => setSelectedBaseUrl('custom')}
                  className="mt-1 text-[#B8860B] focus:ring-[#B8860B]"
                />
                <div className="flex-1 space-y-1.5">
                  <span className="font-semibold text-[#231F1A] block">
                    Ketik Alamat IP / Domain Manual
                  </span>
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => {
                      setCustomUrlInput(e.target.value);
                      setSelectedBaseUrl('custom');
                    }}
                    placeholder="Contoh: http://192.168.1.100:3000 atau https://inventaris.kantor.com"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:ring-1 focus:ring-[#B8860B]"
                  />
                </div>
              </label>

              {/* Localhost (Strictly discouraged for HP) */}
              <label className="flex items-start gap-2.5 p-2 rounded-lg border border-dashed border-[#EAE4D9] bg-white opacity-75 cursor-pointer">
                <input
                  type="radio"
                  name="baseUrlChoice"
                  checked={selectedBaseUrl === 'http://localhost:3000'}
                  onChange={() => setSelectedBaseUrl('http://localhost:3000')}
                  className="mt-0.5 text-gray-500"
                />
                <div>
                  <span className="font-medium text-[#70685C] flex items-center gap-1.5">
                    http://localhost:3000
                    <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                      ⚠️ Hanya untuk laptop ini, HP TIDAK bisa scan
                    </span>
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGenerateModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCreateToken}
              isLoading={isGenerating}
              disabled={isGenerating || (selectedBaseUrl === 'custom' && !customUrlInput.trim())}
              className="font-bold text-xs"
            >
              Generate QR Code dengan IP Ini
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
