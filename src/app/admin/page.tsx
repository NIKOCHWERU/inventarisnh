'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Layers,
  Users,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Clock,
  ArrowRight,
  TrendingUp,
  Image as ImageIcon,
  PlusCircle,
  QrCode,
  FileSpreadsheet,
  ShoppingCart,
  Package,
  Plus,
  Minus,
  AlertCircle,
} from 'lucide-react';
import { ConditionBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatPhotoUrl } from '@/lib/base-path';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>('inventory');
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);

  async function loadStats() {
    try {
      const res = await fetch('/api/dashboard/stats');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleQuickStock(item: any, delta: number) {
    const newQty = Math.max(0, item.quantity + delta);
    setUpdatingStockId(item.id);
    try {
      const res = await fetch(`/api/logistics/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (res.ok) {
        setData((prev: any) => {
          if (!prev?.logisticsStats) return prev;
          const updatedRecent = prev.logisticsStats.recentItems.map((i: any) =>
            i.id === item.id ? { ...i, quantity: newQty } : i
          );
          const updatedLowStock = prev.logisticsStats.lowStockItems.map((i: any) =>
            i.id === item.id ? { ...i, quantity: newQty } : i
          );
          return {
            ...prev,
            logisticsStats: {
              ...prev.logisticsStats,
              recentItems: updatedRecent,
              lowStockItems: updatedLowStock,
            },
          };
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStockId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#70685C]">Memuat statistik dashboard...</p>
      </div>
    );
  }

  const stats = data?.stats || {
    totalTypes: 0,
    totalUnits: 0,
    totalCategories: 0,
    totalEmployees: 0,
    baikCount: 0,
    rusakRinganCount: 0,
    rusakBeratCount: 0,
    totalRusak: 0,
    perluPerbaikanCount: 0,
  };

  const logisticsStats = data?.logisticsStats || {
    totalTypes: 0,
    totalUnits: 0,
    lowStockCount: 0,
    categoriesCount: 0,
    byCategory: [],
    lowStockItems: [],
    recentItems: [],
  };

  const charts = data?.charts || { byCategory: [], byCondition: [] };
  const recentInventories = data?.recentInventories || [];
  const recentActivities = data?.recentActivities || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE4D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#231F1A]">
            Dashboard Administrator
          </h1>
          <p className="text-xs text-[#70685C] mt-1">
            Ringkasan data aset inventaris kantor dan perputaran stok logistik di Kantor Narasumberhukum.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/qr-code">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <QrCode className="w-4 h-4 text-[#B8860B]" />
              Buat QR Code
            </Button>
          </Link>
          <Link href="/admin/reports">
            <Button variant="primary" size="sm" className="gap-1.5 text-xs">
              <FileSpreadsheet className="w-4 h-4" />
              Laporan & Export
            </Button>
          </Link>
        </div>
      </div>

      {/* Segmented Switcher: Inventaris vs Logistik */}
      <div className="bg-white p-1.5 rounded-2xl border border-[#EAE4D9] shadow-2xs flex gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2.5 ${
            activeTab === 'inventory'
              ? 'bg-[#B8860B] text-white shadow-sm'
              : 'text-[#70685C] hover:bg-[#FAF9F5] hover:text-[#231F1A]'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>📦 Aset Inventaris Kantor</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'inventory' ? 'bg-black/20 text-white' : 'bg-[#F4F0E8] text-[#70685C]'
            }`}
          >
            {stats.totalTypes} Jenis
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logistics')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2.5 relative ${
            activeTab === 'logistics'
              ? 'bg-[#B8860B] text-white shadow-sm'
              : 'text-[#70685C] hover:bg-[#FAF9F5] hover:text-[#231F1A]'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>🛒 Logistik & Stok Habis Pakai</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'logistics' ? 'bg-black/20 text-white' : 'bg-[#F4F0E8] text-[#70685C]'
            }`}
          >
            {logisticsStats.totalTypes} Item
          </span>

          {logisticsStats.lowStockCount > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" title="Ada stok menipis!" />
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: INVENTARIS ASET KANTOR                                 */}
      {/* ============================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main KPI Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link
              href="/admin/inventory"
              className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs hover:border-[#B8860B] hover:shadow-md transition-all cursor-pointer group block"
              title="Klik untuk melihat seluruh jenis barang inventaris"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#70685C] group-hover:text-[#B8860B] transition">Total Jenis Barang</span>
                <div className="w-8 h-8 rounded-lg bg-[#F7F2E4] border border-[#E5D7B7] flex items-center justify-center text-[#7A5805] group-hover:bg-[#B8860B] group-hover:text-white transition">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-bold text-[#231F1A]">{stats.totalTypes}</span>
                  <span className="text-xs text-[#70685C] ml-1">jenis aset</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#C5A059] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link
              href="/admin/inventory"
              className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs hover:border-[#B8860B] hover:shadow-md transition-all cursor-pointer group block"
              title="Klik untuk melihat seluruh unit fisik barang inventaris"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#70685C] group-hover:text-[#B8860B] transition">Total Unit Fisik</span>
                <div className="w-8 h-8 rounded-lg bg-[#F7F2E4] border border-[#E5D7B7] flex items-center justify-center text-[#7A5805] group-hover:bg-[#B8860B] group-hover:text-white transition">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-bold text-[#231F1A]">{stats.totalUnits}</span>
                  <span className="text-xs text-[#70685C] ml-1">unit total</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#C5A059] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link
              href="/admin/inventory"
              className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs hover:border-[#B8860B] hover:shadow-md transition-all cursor-pointer group block"
              title="Klik untuk melihat dan memfilter kategori aset"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#70685C] group-hover:text-[#B8860B] transition">Kategori Aset</span>
                <div className="w-8 h-8 rounded-lg bg-[#F4F0E8] border border-[#EAE4D9] flex items-center justify-center text-[#70685C] group-hover:bg-[#B8860B] group-hover:text-white transition">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-bold text-[#231F1A]">{stats.totalCategories}</span>
                  <span className="text-xs text-[#70685C] ml-1">kategori aktif</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#C5A059] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link
              href="/admin/employees"
              className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs hover:border-[#B8860B] hover:shadow-md transition-all cursor-pointer group block"
              title="Klik untuk melihat karyawan penginput inventaris"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#70685C] group-hover:text-[#B8860B] transition">Karyawan Penginput</span>
                <div className="w-8 h-8 rounded-lg bg-[#F7F2E4] border border-[#E5D7B7] flex items-center justify-center text-[#7A5805] group-hover:bg-[#B8860B] group-hover:text-white transition">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-bold text-[#231F1A]">{stats.totalEmployees}</span>
                  <span className="text-xs text-[#70685C] ml-1">orang</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#C5A059] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          </div>

          {/* Condition Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Link
              href="/admin/inventory?condition=Baik"
              className="bg-[#EBF5ED] rounded-xl border border-[#C2E2CA] p-4 flex items-center justify-between gap-3 hover:border-[#2B6336] hover:shadow-md transition-all cursor-pointer group block"
              title="Klik untuk melihat daftar inventaris dengan Kondisi Baik"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#2B6336] shadow-2xs group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-[#2B6336] font-medium block">Kondisi Baik</span>
                  <span className="text-xl font-bold text-[#2B6336]">{stats.baikCount}</span>
                  <span className="text-[11px] text-[#2B6336] ml-1">barang</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#2B6336] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/admin/inventory?condition=Rusak"
              className="bg-[#FEF7E6] rounded-xl border border-[#FBE3B5] p-4 flex items-center justify-between gap-3 hover:border-[#A36B00] hover:shadow-md transition-all cursor-pointer group block"
              title="Klik untuk melihat seluruh inventaris Rusak (Ringan & Berat)"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#A36B00] shadow-2xs group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-[#A36B00] font-medium block">Kondisi Rusak</span>
                  <span className="text-xl font-bold text-[#A36B00]">{stats.totalRusak}</span>
                  <span className="text-[11px] text-[#A36B00] ml-1">
                    ({stats.rusakRinganCount} ringan, {stats.rusakBeratCount} berat)
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#A36B00] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/admin/inventory?condition=Perlu Perbaikan"
              className="bg-[#F2F5FD] rounded-xl border border-[#C7D7FB] p-4 flex items-center justify-between gap-3 hover:border-[#2B52BA] hover:shadow-md transition-all cursor-pointer group block"
              title="Klik untuk melihat daftar inventaris yang Perlu Perbaikan"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#2B52BA] shadow-2xs group-hover:scale-110 transition-transform">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-[#2B52BA] font-medium block">Perlu Perbaikan</span>
                  <span className="text-xl font-bold text-[#2B52BA]">{stats.perluPerbaikanCount}</span>
                  <span className="text-[11px] text-[#2B52BA] ml-1">barang</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#2B52BA] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAE4D9]">
                <h3 className="text-sm font-bold text-[#231F1A] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#B8860B]" />
                  Aset Berdasarkan Kategori
                </h3>
                <span className="text-xs text-[#70685C]">{charts.byCategory.length} kategori</span>
              </div>

              <div className="space-y-3 pt-1">
                {charts.byCategory.map((cat: any) => {
                  const maxCount = Math.max(...charts.byCategory.map((c: any) => c.count), 1);
                  const percentage = Math.round((cat.count / maxCount) * 100);
                  const targetHref = cat.id ? `/admin/inventory?category_id=${cat.id}` : '/admin/inventory';
                  return (
                    <Link
                      key={cat.name}
                      href={targetHref}
                      className="space-y-1 block p-1 -m-1 rounded-lg hover:bg-[#FAF9F5] transition group"
                      title={`Klik untuk memfilter inventaris kategori: ${cat.name}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#231F1A] group-hover:text-[#B8860B] transition">{cat.name}</span>
                        <span className="font-semibold text-[#70685C]">{cat.count} barang</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F4F0E8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#B8860B] rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAE4D9]">
                <h3 className="text-sm font-bold text-[#231F1A] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#B8860B]" />
                  Distribusi Kondisi Fisik Aset
                </h3>
                <span className="text-xs text-[#70685C]">Total {stats.totalTypes} jenis</span>
              </div>

              <div className="space-y-3 pt-1">
                {charts.byCondition.map((cond: any) => {
                  const totalItems = stats.totalTypes || 1;
                  const pct = Math.round((cond.count / totalItems) * 100);
                  return (
                    <Link
                      key={cond.name}
                      href={`/admin/inventory?condition=${encodeURIComponent(cond.name)}`}
                      className="space-y-1 block p-1 -m-1 rounded-lg hover:bg-[#FAF9F5] transition group"
                      title={`Klik untuk memfilter inventaris kondisi: ${cond.name}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#231F1A] group-hover:text-[#B8860B] transition flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: cond.color }}
                          />
                          {cond.name}
                        </span>
                        <span className="text-[#70685C]">
                          <strong>{cond.count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F4F0E8] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: cond.color }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Inventories & Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAE4D9]">
                <div>
                  <h3 className="text-sm font-bold text-[#231F1A]">Daftar Inventaris Terbaru</h3>
                  <p className="text-[11px] text-[#70685C]">Barang yang baru saja ditambahkan ke sistem</p>
                </div>
                <Link
                  href="/admin/inventory"
                  className="text-xs font-semibold text-[#B8860B] hover:text-[#7A5805] flex items-center gap-1"
                >
                  Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-[#EAE4D9]">
                {recentInventories.map((item: any) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.photoPath ? (
                        <img
                          src={formatPhotoUrl(item.photoPath)}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover border border-[#EAE4D9] flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#F4F0E8] border border-[#EAE4D9] flex items-center justify-center text-[#B8860B] flex-shrink-0">
                          <Boxes className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-[#231F1A] block truncate">{item.name}</span>
                        <span className="text-[11px] text-[#70685C]">
                          {item.category} • {item.location} ({item.quantity} {item.unit || 'PCS'})
                        </span>
                      </div>
                    </div>
                    <ConditionBadge condition={item.condition} />
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Logs */}
            <div className="bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-4">
              <div className="pb-2 border-b border-[#EAE4D9]">
                <h3 className="text-sm font-bold text-[#231F1A]">Riwayat Aktivitas</h3>
                <p className="text-[11px] text-[#70685C]">Catatan audit input dan perubahan data</p>
              </div>

              <div className="space-y-3">
                {recentActivities.map((act: any) => (
                  <div key={act.id} className="text-xs border-l-2 border-[#B8860B] pl-2.5 space-y-0.5">
                    <p className="font-medium text-[#231F1A]">
                      <span className="font-bold">{act.userName}</span> {act.action.toLowerCase()}{' '}
                      <span className="italic">{act.itemName}</span>
                    </p>
                    <span className="text-[10px] text-[#70685C] block">
                      {new Date(act.createdAt).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: LOGISTIK & STOK HABIS PAKAI                            */}
      {/* ============================================================== */}
      {activeTab === 'logistics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Logistics KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs">
              <span className="text-xs font-medium text-[#70685C] block">Total Jenis Logistik</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#231F1A]">{logisticsStats.totalTypes}</span>
                <span className="text-xs text-[#70685C]">item</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs">
              <span className="text-xs font-medium text-[#70685C] block">Total Stok Fisik Tersedia</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#231F1A]">{logisticsStats.totalUnits}</span>
                <span className="text-xs text-[#70685C]">unit / pack</span>
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 shadow-2xs ${
                logisticsStats.lowStockCount > 0 ? 'bg-[#FFF8F0] border-[#FBD38D]' : 'bg-white border-[#EAE4D9]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#C53030]">Peringatan Stok Menipis</span>
                <AlertTriangle className="w-4 h-4 text-[#C53030]" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#C53030]">{logisticsStats.lowStockCount}</span>
                <span className="text-xs text-[#C53030]">barang hampir habis</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs">
              <span className="text-xs font-medium text-[#70685C] block">Kategori Logistik</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#231F1A]">{logisticsStats.categoriesCount}</span>
                <span className="text-xs text-[#70685C]">kategori</span>
              </div>
            </div>
          </div>

          {/* Low Stock Urgent Alerts (if any) */}
          {logisticsStats.lowStockItems.length > 0 && (
            <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#C53030]">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Perhatian: {logisticsStats.lowStockItems.length} Barang Perlu Dibelanjakan / Restok Segera!
                  </h3>
                </div>
                <Link
                  href="/admin/logistics"
                  className="text-xs font-bold text-[#C53030] underline hover:text-red-800"
                >
                  Kelola di Halaman Logistik →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {logisticsStats.lowStockItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-lg border border-red-200 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-[#231F1A] block truncate">{item.name}</span>
                      <span className="text-[11px] text-[#C53030] font-semibold block">
                        Sisa: {item.quantity} {item.unit} (Min: {item.min_stock})
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={updatingStockId === item.id}
                        onClick={() => handleQuickStock(item, 5)}
                        className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold hover:bg-emerald-100 transition"
                        title="Restock +5"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Interactive Logistics Table */}
          <div className="bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#EAE4D9]">
              <div>
                <h3 className="text-sm font-bold text-[#231F1A] flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#B8860B]" />
                  Stok Logistik & Konsumsi Kantor (Pengelolaan Cepat)
                </h3>
                <p className="text-[11px] text-[#70685C]">
                  Klik tombol <strong>+</strong> atau <strong>-</strong> untuk langsung mengubah stok secara instan tanpa reload halaman.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/admin/logistics">
                  <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                    Buka Halaman Lengkap Logistik <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F5] border-b border-[#EAE4D9] text-[#70685C] uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Nama Barang</th>
                    <th className="px-3 py-2.5 font-semibold">Kategori</th>
                    <th className="px-3 py-2.5 font-semibold">Lokasi</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Stok</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Status</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Ubah Stok Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D9]">
                  {logisticsStats.recentItems.map((item: any) => {
                    const isLow = item.quantity <= item.min_stock;
                    const isUpdating = updatingStockId === item.id;

                    return (
                      <tr key={item.id} className="hover:bg-[#FAF9F5] transition">
                        <td className="px-3 py-2.5 font-bold text-[#231F1A]">
                          {item.name}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-[#FAF6EC] border border-[#E5D7B7] text-[#7A5805] text-[10px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[#70685C]">{item.location}</td>
                        <td className="px-3 py-2.5 text-center font-bold">
                          <span className={isLow ? 'text-red-600' : 'text-[#231F1A]'}>
                            {item.quantity}
                          </span>{' '}
                          <span className="text-[10px] text-[#70685C] font-normal">{item.unit}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {isLow ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">
                              Hampir Habis
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-medium border border-emerald-200">
                              Tersedia
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              disabled={isUpdating || item.quantity <= 0}
                              onClick={() => handleQuickStock(item, -1)}
                              className="w-6 h-6 rounded bg-[#FAF9F5] border border-[#EAE4D9] hover:bg-red-50 text-[#70685C] hover:text-red-600 flex items-center justify-center disabled:opacity-30"
                              title="Kurang 1"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleQuickStock(item, 1)}
                              className="w-6 h-6 rounded bg-[#FAF9F5] border border-[#EAE4D9] hover:bg-emerald-50 text-[#70685C] hover:text-emerald-700 flex items-center justify-center"
                              title="Tambah 1"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleQuickStock(item, 5)}
                              className="px-1.5 h-6 rounded bg-[#F7F2E4] border border-[#E5D7B7] hover:bg-[#FAF6EC] text-[#7A5805] text-[10px] font-bold"
                              title="Tambah 5"
                            >
                              +5
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
