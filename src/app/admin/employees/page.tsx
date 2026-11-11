'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  QrCode,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Boxes,
  Clock,
  ShieldAlert,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Status toggle confirmation
  const [statusConfirmEmp, setStatusConfirmEmp] = useState<any | null>(null);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<any | null>(null);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.employees) {
        setEmployees(data.employees);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const openEmployeeDetail = async (emp: any) => {
    setSelectedEmployee(emp);
    setIsDetailOpen(true);
    setIsLoadingDetails(true);

    try {
      const res = await fetch(`/api/employees/${emp.id}`);
      const data = await res.json();
      if (data.employee) {
        setEmployeeDetails(data.employee);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusConfirmEmp) return;
    const newStatus = statusConfirmEmp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      const res = await fetch(`/api/employees/${statusConfirmEmp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatusConfirmEmp(null);
        loadEmployees();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAccess = async () => {
    if (!deleteConfirmEmp) return;
    try {
      const res = await fetch(`/api/employees/${deleteConfirmEmp.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteConfirmEmp(null);
        loadEmployees();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE4D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#231F1A]">
            Karyawan / Penginput
          </h1>
          <p className="text-xs text-[#70685C] mt-1">
            Daftar karyawan yang terdaftar melalui QR Code dengan role otomatis Penginventaris.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/qr-code">
            <Button variant="primary" size="sm" className="gap-1.5 text-xs">
              <QrCode className="w-4 h-4" />
              Buat QR Code Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#C5A059] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama karyawan penginput..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] placeholder-[#C5A059]/70 focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
          />
        </div>

        <span className="text-xs font-semibold text-[#70685C]">
          Total {filteredEmployees.length} Karyawan
        </span>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-[#EAE4D9] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF9F5] border-b border-[#EAE4D9] text-[#70685C] font-semibold">
                <th className="py-3 px-4">Nama Karyawan</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3 text-center">Total Jenis Barang</th>
                <th className="py-3 px-3 text-center">Total Unit Barang</th>
                <th className="py-3 px-3">Tanggal Bergabung</th>
                <th className="py-3 px-3">Aktivitas Terakhir</th>
                <th className="py-3 px-3 text-center">Status Akun</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D9]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#70685C]">
                    Memuat data karyawan penginput...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#70685C]">
                    Belum ada karyawan yang terdaftar. Buat QR Code untuk mengajak karyawan menginput inventaris.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#FAF9F5] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#231F1A]">
                      <button
                        onClick={() => openEmployeeDetail(emp)}
                        className="hover:text-[#B8860B] text-left"
                      >
                        {emp.name}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-[#F7F2E4] text-[#7A5805] text-[11px] font-medium">
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-[#231F1A]">
                      {emp.totalItems} jenis
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-[#7A5805]">
                      {emp.totalUnits} unit
                    </td>
                    <td className="py-3 px-3 text-[#70685C]">
                      {new Date(emp.joinedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-3 text-[#70685C]">
                      {new Date(emp.lastActivity).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={emp.status === 'ACTIVE' ? 'active' : 'inactive'}>
                        {emp.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEmployeeDetail(emp)}
                          title="Lihat Detail & Barang Input"
                          className="p-1.5 text-[#70685C] hover:text-[#B8860B] hover:bg-[#F7F2E4] rounded-md transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setStatusConfirmEmp(emp)}
                          title={
                            emp.status === 'ACTIVE'
                              ? 'Nonaktifkan Akun'
                              : 'Aktifkan Akun'
                          }
                          className={`p-1.5 rounded-md transition ${
                            emp.status === 'ACTIVE'
                              ? 'text-[#70685C] hover:text-[#A36B00] hover:bg-[#FEF7E6]'
                              : 'text-[#70685C] hover:text-[#2B6336] hover:bg-[#EBF5ED]'
                          }`}
                        >
                          {emp.status === 'ACTIVE' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmEmp(emp)}
                          title="Cabut Akses Karyawan"
                          className="p-1.5 text-[#70685C] hover:text-red-600 hover:bg-red-50 rounded-md transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL EMPLOYEE MODAL */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Aktivitas & Barang: ${selectedEmployee?.name || ''}`}
        maxWidth="lg"
      >
        {isLoadingDetails ? (
          <div className="py-8 text-center text-xs text-[#70685C]">
            Memuat riwayat inventaris karyawan...
          </div>
        ) : employeeDetails ? (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#EAE4D9] flex items-center justify-between">
              <div>
                <span className="text-[#70685C] block">Nama Karyawan</span>
                <span className="text-sm font-bold text-[#231F1A]">
                  {employeeDetails.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[#70685C] block">Total Kontribusi</span>
                <span className="text-sm font-bold text-[#7A5805]">
                  {employeeDetails.inventories.length} Barang (
                  {employeeDetails.inventories.reduce(
                    (a: number, c: any) => a + c.quantity,
                    0
                  )}{' '}
                  Unit)
                </span>
              </div>
            </div>

            {/* List of Inventories submitted by this employee */}
            <div>
              <h4 className="font-bold text-[#231F1A] mb-2 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-[#B8860B]" />
                Seluruh Barang yang Diinput ({employeeDetails.inventories.length})
              </h4>

              {employeeDetails.inventories.length === 0 ? (
                <p className="text-[#70685C] italic py-2">
                  Karyawan ini belum melakukan input inventaris apapun.
                </p>
              ) : (
                <div className="border border-[#EAE4D9] rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF9F5] border-b border-[#EAE4D9] text-[#70685C]">
                      <tr>
                        <th className="p-2">Nama Barang</th>
                        <th className="p-2">Kategori</th>
                        <th className="p-2 text-right">Jumlah</th>
                        <th className="p-2">Kondisi</th>
                        <th className="p-2">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE4D9]">
                      {employeeDetails.inventories.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-[#FAF9F5]">
                          <td className="p-2 font-semibold text-[#231F1A]">
                            {inv.name}
                          </td>
                          <td className="p-2 text-[#70685C]">{inv.category.name}</td>
                          <td className="p-2 text-right font-bold text-[#231F1A]">
                            {inv.quantity}
                          </td>
                          <td className="p-2">{inv.condition}</td>
                          <td className="p-2 text-[#70685C]">
                            {new Date(inv.created_at).toLocaleDateString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* STATUS TOGGLE MODAL */}
      <Modal
        isOpen={Boolean(statusConfirmEmp)}
        onClose={() => setStatusConfirmEmp(null)}
        title="Ubah Status Karyawan"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#231F1A]">
            Ubah status akun <strong>{statusConfirmEmp?.name}</strong> menjadi{' '}
            <strong>
              {statusConfirmEmp?.status === 'ACTIVE' ? 'NONAKTIF' : 'AKTIF'}
            </strong>
            ?
          </p>
          {statusConfirmEmp?.status === 'ACTIVE' && (
            <p className="text-[#A36B00] bg-[#FEF7E6] p-2 rounded border border-[#FBE3B5]">
              Jika dinonaktifkan, sesi login karyawan akan langsung dibatalkan dan tidak dapat melakukan input barang baru.
            </p>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusConfirmEmp(null)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleToggleStatus}
            >
              Ya, Simpan Status
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE ACCESS MODAL */}
      <Modal
        isOpen={Boolean(deleteConfirmEmp)}
        onClose={() => setDeleteConfirmEmp(null)}
        title="Konfirmasi Cabut Akses Karyawan"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#231F1A]">
            Apakah Anda yakin ingin mencabut akses <strong>{deleteConfirmEmp?.name}</strong>?
          </p>
          <p className="text-[#70685C]">
            Akun akan dinonaktifkan dan sesi dicabut. Riwayat barang yang pernah diinput tetap dipertahankan demi integritas pembukuan inventaris.
          </p>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmEmp(null)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccess}
            >
              Ya, Cabut Akses
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
