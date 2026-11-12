'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  Package,
  Layers,
  AlertTriangle,
  ArrowRight,
  Eye,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { formatPhotoUrl } from '@/lib/base-path';
import { formatRupiah } from '@/lib/format';

interface LogisticsCompareViewProps {
  onOpenEditModal?: (item: any) => void;
}

export function LogisticsCompareView({ onOpenEditModal }: LogisticsCompareViewProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const lastDayOfMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();

  // Date Range state (defaults to current month)
  const [startDate, setStartDate] = useState(`${currentYear}-${currentMonth}-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-${currentMonth}-${String(lastDayOfMonth).padStart(2, '0')}`);
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [search, setSearch] = useState('');

  // Data states
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Preset Helper
  const applyPreset = (preset: 'THIS_MONTH' | 'LAST_30' | 'LAST_MONTH') => {
    const today = new Date();
    if (preset === 'THIS_MONTH') {
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, today.getMonth() + 1, 0).getDate();
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'LAST_30') {
      const endD = new Date();
      const startD = new Date();
      startD.setDate(startD.getDate() - 30);
      setStartDate(startD.toISOString().split('T')[0]);
      setEndDate(endD.toISOString().split('T')[0]);
    } else if (preset === 'LAST_MONTH') {
      const prevM = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const y = prevM.getFullYear();
      const m = String(prevM.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, prevM.getMonth() + 1, 0).getDate();
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    }
  };

  const fetchComparison = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (selectedCategory && selectedCategory !== 'Semua Kategori') {
        params.set('category', selectedCategory);
      }

      const res = await fetch(`/api/logistics/compare?${params.toString()}`);
      const result = await res.json();
      if (res.ok && result.success) {
        setData(result);
      } else {
        throw new Error(result.error || 'Gagal memuat data komparasi.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [startDate, endDate, selectedCategory]);

  const filteredItems = (data?.items || []).filter((item: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Date Range Selector & Filter Card */}
      <div className="bg-white rounded-2xl border border-[#EAE4D9] p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE4D9]">
          <div>
            <h3 className="text-sm font-bold text-[#231F1A] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#B8860B]" />
              Pilih Rentang Tanggal Komparasi Logistik
            </h3>
            <p className="text-[11px] text-[#70685C] mt-0.5">
              Bandingkan stok masuk dan pemakaian logistik periode terpilih dengan bulan / periode sebelumnya.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[#8C8273]">Preset Cepat:</span>
            <button
              type="button"
              onClick={() => applyPreset('THIS_MONTH')}
              className="px-2.5 py-1 rounded-lg bg-[#FAF6EC] hover:bg-[#F5EED8] text-[#7A5805] border border-[#E5D7B7] text-[11px] font-semibold transition"
            >
              Bulan Ini vs Bulan Lalu
            </button>
            <button
              type="button"
              onClick={() => applyPreset('LAST_30')}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FAF9F5] text-[#70685C] border border-[#EAE4D9] text-[11px] font-semibold transition"
            >
              30 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => applyPreset('LAST_MONTH')}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FAF9F5] text-[#70685C] border border-[#EAE4D9] text-[11px] font-semibold transition"
            >
              Bulan Lalu
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-[#70685C] mb-1">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs font-semibold text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#70685C] mb-1">
              Tanggal Selesai
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs font-semibold text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#70685C] mb-1">
              Filter Kategori Logistik
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs font-semibold text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
            >
              <option value="Semua Kategori">Semua Kategori</option>
              <option value="Makanan & Minuman">Makanan & Minuman</option>
              <option value="Kebersihan">Kebersihan</option>
              <option value="ATK (Alat Tulis Kantor)">ATK (Alat Tulis Kantor)</option>
              <option value="Peralatan Dapur">Peralatan Dapur</option>
              <option value="Sanitasi & Kesehatan">Sanitasi & Kesehatan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>

        {/* Periode Terpilih Banner */}
        {data?.periods && (
          <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#EAE4D9] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B8860B]" />
              <span className="text-[#70685C]">Periode Utama:</span>
              <strong className="text-[#231F1A]">{data.periods.current.label}</strong>
            </div>
            <div className="flex items-center gap-2 text-[#70685C]">
              <ArrowRight className="w-3.5 h-3.5 text-[#B8860B] hidden sm:block" />
              <span>Banding vs Periode Lalu:</span>
              <strong className="text-[#7A5805]">{data.periods.previous.label}</strong>
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="p-12 text-center text-xs text-[#70685C] bg-white rounded-2xl border border-[#EAE4D9]">
          <div className="w-6 h-6 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Memuat perbandingan data logistik...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {!isLoading && data && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Stok Masuk Card */}
            <div className="bg-white rounded-2xl border border-[#EAE4D9] p-4 shadow-2xs">
              <div className="flex items-center justify-between text-[#70685C]">
                <span className="text-xs font-semibold">Total Stok Masuk</span>
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  +
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#231F1A]">
                  {data.summary.current.totalStockIn}
                </span>
                <span className="text-xs text-[#70685C]">unit masuk</span>
              </div>
              <div className="mt-2 text-[11px] text-[#70685C] flex items-center gap-1.5">
                <span>Periode lalu: {data.summary.previous.totalStockIn}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    data.summary.comparison.inDiff >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {data.summary.comparison.inDiff >= 0 ? `+${data.summary.comparison.inDiff}` : data.summary.comparison.inDiff}
                </span>
              </div>
            </div>

            {/* Stok Keluar (Pemakaian) Card */}
            <div className="bg-white rounded-2xl border border-[#EAE4D9] p-4 shadow-2xs">
              <div className="flex items-center justify-between text-[#70685C]">
                <span className="text-xs font-semibold">Total Stok Keluar / Pakai</span>
                <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                  -
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#231F1A]">
                  {data.summary.current.totalStockOut}
                </span>
                <span className="text-xs text-[#70685C]">unit terpakai</span>
              </div>
              <div className="mt-2 text-[11px] text-[#70685C] flex items-center gap-1.5">
                <span>Periode lalu: {data.summary.previous.totalStockOut}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold flex items-center gap-0.5 ${
                    data.summary.comparison.outDiff > 0
                      ? 'bg-rose-100 text-rose-800'
                      : data.summary.comparison.outDiff < 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {data.summary.comparison.outDiff > 0 ? (
                    <>
                      <TrendingUp className="w-3 h-3" />
                      +{data.summary.comparison.outPercentageChange}%
                    </>
                  ) : data.summary.comparison.outDiff < 0 ? (
                    <>
                      <TrendingDown className="w-3 h-3" />
                      {data.summary.comparison.outPercentageChange}%
                    </>
                  ) : (
                    '0%'
                  )}
                </span>
              </div>
            </div>

            {/* Net Selisih Perputaran */}
            <div className="bg-white rounded-2xl border border-[#EAE4D9] p-4 shadow-2xs">
              <div className="flex items-center justify-between text-[#70685C]">
                <span className="text-xs font-semibold">Net Perputaran Stok</span>
                <RefreshCw className="w-4 h-4 text-[#B8860B]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-black ${
                    data.summary.current.netChange >= 0 ? 'text-[#2B6336]' : 'text-rose-600'
                  }`}
                >
                  {data.summary.current.netChange >= 0
                    ? `+${data.summary.current.netChange}`
                    : data.summary.current.netChange}
                </span>
                <span className="text-xs text-[#70685C]">unit net</span>
              </div>
              <p className="mt-2 text-[11px] text-[#70685C]">
                {data.summary.current.netChange >= 0
                  ? 'Stok masuk melebihi pemakaian'
                  : 'Pemakaian melebihi penambahan stok'}
              </p>
            </div>

            {/* Total Items & Status */}
            <div className="bg-white rounded-2xl border border-[#EAE4D9] p-4 shadow-2xs">
              <div className="flex items-center justify-between text-[#70685C]">
                <span className="text-xs font-semibold">Total Item Terdaftar</span>
                <Package className="w-4 h-4 text-[#B8860B]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#231F1A]">
                  {data.summary.totalItems}
                </span>
                <span className="text-xs text-[#70685C]">jenis barang</span>
              </div>
              <p className="mt-2 text-[11px] text-[#70685C]">
                Stok logistik aktif di inventaris kantor
              </p>
            </div>
          </div>

          {/* Top 5 Most Consumed Items & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Consumed Items */}
            <div className="bg-white rounded-2xl border border-[#EAE4D9] p-4 sm:p-5 shadow-2xs">
              <h4 className="text-xs font-bold text-[#231F1A] flex items-center gap-1.5 mb-3">
                <TrendingUp className="w-4 h-4 text-rose-500" />
                Top 5 Barang Paling Banyak Dipakai Periode Ini
              </h4>

              {data.topUsedItems.length === 0 || data.topUsedItems.every((i: any) => i.currentPeriod.stockOut === 0) ? (
                <p className="text-xs text-[#70685C] py-4 text-center">
                  Belum ada catatan pemakaian barang pada rentang tanggal ini.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {data.topUsedItems.map((item: any, idx: number) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EAE4D9] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#FAF6EC] border border-[#E5D7B7] text-[#7A5805] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-[#231F1A] block truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-[#70685C]">
                            {item.category} · Sisa: {item.currentStock} {item.unit}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-extrabold text-rose-700 text-sm block">
                          -{item.currentPeriod.stockOut} {item.unit}
                        </span>
                        <span className="text-[10px] text-[#70685C]">
                          Bulan lalu: {item.previousPeriod.stockOut} {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Consumption Breakdown */}
            <div className="bg-white rounded-2xl border border-[#EAE4D9] p-4 sm:p-5 shadow-2xs">
              <h4 className="text-xs font-bold text-[#231F1A] flex items-center gap-1.5 mb-3">
                <Layers className="w-4 h-4 text-[#B8860B]" />
                Perbandingan Aktivitas per Kategori
              </h4>

              <div className="space-y-2.5">
                {Object.entries(data.categoryStats || {}).map(([catName, stats]: [string, any]) => (
                  <div
                    key={catName}
                    className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EAE4D9] text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-[#231F1A] block">{catName}</span>
                      <span className="text-[10px] text-[#70685C]">
                        {stats.itemCount} jenis barang
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-[#70685C] block">Masuk</span>
                        <span className="font-bold text-emerald-700">
                          +{stats.currentIn}
                        </span>
                        <span className="text-[9px] text-[#8C8273] block">
                          (Lalu: {stats.previousIn})
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#70685C] block">Keluar</span>
                        <span className="font-bold text-rose-700">
                          -{stats.currentOut}
                        </span>
                        <span className="text-[9px] text-[#8C8273] block">
                          (Lalu: {stats.previousOut})
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full Comparison Table */}
          <div className="bg-white rounded-2xl border border-[#EAE4D9] shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#EAE4D9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-[#231F1A]">
                  Tabel Lengkap Perbandingan Stok Logistik
                </h4>
                <p className="text-[11px] text-[#70685C] mt-0.5">
                  Menampilkan {filteredItems.length} dari {data.items.length} item logistik
                </p>
              </div>

              {/* Search in table */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8273]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari barang, ruangan, kategori..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#EAE4D9] text-xs focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF9F5] border-b border-[#EAE4D9] text-[#70685C] text-[11px] font-bold">
                    <th className="py-3 px-4">Nama Barang Logistik</th>
                    <th className="py-3 px-3">Kategori & Lokasi</th>
                    <th className="py-3 px-3 text-center">
                      Stok Masuk
                      <span className="block text-[9px] font-normal text-[#8C8273]">
                        Periode Ini vs Lalu
                      </span>
                    </th>
                    <th className="py-3 px-3 text-center">
                      Stok Keluar (Pakai)
                      <span className="block text-[9px] font-normal text-[#8C8273]">
                        Periode Ini vs Lalu
                      </span>
                    </th>
                    <th className="py-3 px-3 text-center">Tren Pemakaian</th>
                    <th className="py-3 px-4 text-right">Sisa Stok Fisik</th>
                    {onOpenEditModal && <th className="py-3 px-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D9]">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={onOpenEditModal ? 7 : 6} className="py-8 text-center text-xs text-[#70685C]">
                        Tidak ada barang logistik yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item: any) => {
                      const isLowStock = item.currentStock <= item.minStock;
                      return (
                        <tr key={item.id} className="hover:bg-[#FAF9F5] transition">
                          {/* Nama */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {item.photoPath ? (
                                <img
                                  src={formatPhotoUrl(item.photoPath)}
                                  alt={item.name}
                                  className="w-9 h-9 rounded-lg object-cover border border-[#EAE4D9] flex-shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-[#FAF6EC] border border-[#E5D7B7] flex items-center justify-center text-[#B8860B] flex-shrink-0 font-bold text-xs">
                                  {item.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-[#231F1A] block">
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-[#70685C]">
                                  Satuan: {item.unit}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Kategori & Lokasi */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F4F0E8] text-[#231F1A]">
                              {item.category}
                            </span>
                            <span className="block text-[10px] text-[#70685C] mt-0.5 truncate max-w-[140px]">
                              📍 {item.location}
                            </span>
                          </td>

                          {/* Stok Masuk */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-emerald-700 block">
                              +{item.currentPeriod.stockIn}
                            </span>
                            <span className="text-[10px] text-[#8C8273]">
                              Lalu: {item.previousPeriod.stockIn}
                            </span>
                          </td>

                          {/* Stok Keluar */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-rose-700 block">
                              -{item.currentPeriod.stockOut}
                            </span>
                            <span className="text-[10px] text-[#8C8273]">
                              Lalu: {item.previousPeriod.stockOut}
                            </span>
                          </td>

                          {/* Tren */}
                          <td className="py-3 px-3 text-center">
                            {item.comparison.outDiff > 0 ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <TrendingUp className="w-3 h-3" />
                                +{item.comparison.outPercentageChange}%
                              </span>
                            ) : item.comparison.outDiff < 0 ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <TrendingDown className="w-3 h-3" />
                                {item.comparison.outPercentageChange}%
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#8C8273] font-medium">
                                Stabil (0%)
                              </span>
                            )}
                          </td>

                          {/* Sisa Stok */}
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`text-sm font-black block ${
                                isLowStock ? 'text-rose-600' : 'text-[#7A5805]'
                              }`}
                            >
                              {item.currentStock} {item.unit}
                            </span>
                            {isLowStock ? (
                              <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                                Menipis (min {item.minStock})
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#2B6336] font-medium">
                                Aman
                              </span>
                            )}
                          </td>

                          {/* Aksi */}
                          {onOpenEditModal && (
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => onOpenEditModal(item)}
                                className="px-2.5 py-1 rounded-lg bg-[#FAF6EC] hover:bg-[#F5EED8] border border-[#B8860B] text-[#7A5805] text-[11px] font-semibold transition"
                              >
                                Edit / Stok
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
