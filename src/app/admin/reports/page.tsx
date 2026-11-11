'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  FileCode,
  Download,
  Filter,
  RefreshCw,
  Boxes,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { withBasePath } from '@/lib/base-path';

export default function AdminReportsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Filter States
  const [categoryId, setCategoryId] = useState('all');
  const [condition, setCondition] = useState('all');
  const [location, setLocation] = useState('');
  const [createdBy, setCreatedBy] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Live count preview
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [catRes, empRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/employees'),
        ]);
        const catData = await catRes.json();
        const empData = await empRes.json();
        if (catData.categories) setCategories(catData.categories);
        if (empData.employees) setEmployees(empData.employees);
      } catch (e) {
        console.error(e);
      }
    }
    loadMeta();
  }, []);

  const updatePreviewCount = async () => {
    setIsLoadingCount(true);
    try {
      const params = new URLSearchParams();
      if (categoryId && categoryId !== 'all') params.set('category_id', categoryId);
      if (condition && condition !== 'all') params.set('condition', condition);
      if (location) params.set('location', location);
      if (createdBy && createdBy !== 'all') params.set('created_by', createdBy);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', '1');

      const res = await fetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();
      if (data.pagination) {
        setFilteredCount(data.pagination.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCount(false);
    }
  };

  useEffect(() => {
    updatePreviewCount();
  }, [categoryId, condition, location, createdBy, startDate, endDate]);

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(format);
    const params = new URLSearchParams();
    if (categoryId && categoryId !== 'all') params.set('category_id', categoryId);
    if (condition && condition !== 'all') params.set('condition', condition);
    if (location) params.set('location', location);
    if (createdBy && createdBy !== 'all') params.set('created_by', createdBy);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const exportUrl = `/api/export/${format}?${params.toString()}`;
    window.location.href = withBasePath(exportUrl);

    setTimeout(() => {
      setIsExporting(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-2 border-b border-[#EAE4D9]">
        <h1 className="text-2xl font-bold text-[#231F1A]">
          Laporan & Ekspor Data
        </h1>
        <p className="text-xs text-[#70685C] mt-1">
          Unduh dokumen laporan inventaris Kantor Narasumberhukum resmi dalam format PDF (A4 Landscape lengkap dengan foto barang), Excel (XLSX), dan CSV.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Filter Configuration */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EAE4D9]">
            <h3 className="text-sm font-bold text-[#231F1A] flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#B8860B]" />
              Filter Data Laporan
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategoryId('all');
                setCondition('all');
                setLocation('');
                setCreatedBy('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-[#70685C]"
            >
              Reset Semua Filter
            </Button>
          </div>

          <p className="text-xs text-[#70685C]">
            Tentukan kriteria data yang ingin dicetak. Kosongkan atau pilih "Semua" untuk mencakup seluruh inventaris kantor.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Category */}
            <div>
              <label className="block font-medium text-[#231F1A] mb-1.5">
                Kategori Barang
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:ring-1 focus:ring-[#B8860B]"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block font-medium text-[#231F1A] mb-1.5">
                Kondisi Barang
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:ring-1 focus:ring-[#B8860B]"
              >
                <option value="all">Semua Kondisi</option>
                <option value="Baik">Baik</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
                <option value="Rusak Berat">Rusak Berat</option>
                <option value="Perlu Perbaikan">Perlu Perbaikan</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block font-medium text-[#231F1A] mb-1.5">
                Tempat / Lokasi
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Contoh: Gudang, Lantai 2..."
                className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:ring-1 focus:ring-[#B8860B]"
              />
            </div>

            {/* Employee */}
            <div>
              <label className="block font-medium text-[#231F1A] mb-1.5">
                Nama Penginput
              </label>
              <select
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:ring-1 focus:ring-[#B8860B]"
              >
                <option value="all">Semua Karyawan Penginput</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <label className="block font-medium text-[#231F1A] mb-1.5">
                Mulai Tanggal Input
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:ring-1 focus:ring-[#B8860B]"
              />
            </div>

            {/* Date Range End */}
            <div>
              <label className="block font-medium text-[#231F1A] mb-1.5">
                Sampai Tanggal Input
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:ring-1 focus:ring-[#B8860B]"
              />
            </div>
          </div>

          {/* Live Count Status */}
          <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#EAE4D9] flex items-center justify-between text-xs">
            <span className="text-[#70685C] flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-[#B8860B]" />
              Jumlah baris data yang akan diekspor:
            </span>
            <span className="font-bold text-sm text-[#231F1A]">
              {isLoadingCount ? 'Menghitung...' : `${filteredCount ?? 0} Barang`}
            </span>
          </div>
        </div>

        {/* Right Column (1 Col): Export Formats */}
        <div className="space-y-4">
          {/* Format 1: PDF Document */}
          <div className="bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FDF2F2] border border-[#F8C4C4] flex items-center justify-center text-[#DC2626]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#231F1A]">
                  Laporan Resmi PDF
                </h4>
                <p className="text-[11px] text-[#70685C]">
                  Format A4 Landscape siap cetak + Foto Barang
                </p>
              </div>
            </div>

            <ul className="text-[11px] text-[#70685C] space-y-1 list-disc pl-4">
              <li>Layout landscape profesional dengan kop Kantor Narasumberhukum.</li>
              <li>Menyertakan foto fisik inventaris langsung di dalam tabel.</li>
              <li>Ringkasan metrik statistik aset di bagian atas.</li>
              <li>Kolom nomor halaman dan tanggal cetak Indonesia.</li>
            </ul>

            <Button
              variant="primary"
              size="md"
              onClick={() => handleExport('pdf')}
              isLoading={isExporting === 'pdf'}
              disabled={Boolean(isExporting) || filteredCount === 0}
              className="w-full gap-2 text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              Unduh Dokumen PDF
            </Button>
          </div>

          {/* Format 2: Excel Spreadsheet */}
          <div className="bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F7F2E4] border border-[#E5D7B7] flex items-center justify-center text-[#7A5805]">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#231F1A]">
                  Spreadsheet Excel (XLSX)
                </h4>
                <p className="text-[11px] text-[#70685C]">
                  Diformat rapi dengan tema Gold
                </p>
              </div>
            </div>

            <ul className="text-[11px] text-[#70685C] space-y-1 list-disc pl-4">
              <li>Header elegan berwarna gold (#B8860B).</li>
              <li>Freeze baris atas & autofilter aktif otomatis.</li>
              <li>Border rapi dan lebar kolom otomatis proporsional.</li>
            </ul>

            <Button
              variant="primary"
              size="md"
              onClick={() => handleExport('excel')}
              isLoading={isExporting === 'excel'}
              disabled={Boolean(isExporting) || filteredCount === 0}
              className="w-full gap-2 text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              Unduh Spreadsheet Excel (.xlsx)
            </Button>
          </div>

          {/* Format 3: CSV File */}
          <div className="bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F4F0E8] border border-[#EAE4D9] flex items-center justify-center text-[#70685C]">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#231F1A]">
                  File CSV (UTF-8)
                </h4>
                <p className="text-[11px] text-[#70685C]">
                  Kompatibel Excel & Google Sheets
                </p>
              </div>
            </div>

            <p className="text-[11px] text-[#70685C]">
              Format data tabular terstandar dengan encoding UTF-8 BOM untuk integrasi sistem dan backup cepat.
            </p>

            <Button
              variant="outline"
              size="md"
              onClick={() => handleExport('csv')}
              isLoading={isExporting === 'csv'}
              disabled={Boolean(isExporting) || filteredCount === 0}
              className="w-full gap-2 text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              Unduh File CSV (.csv)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
