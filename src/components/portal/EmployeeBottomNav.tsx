'use client';

import React from 'react';
import { PlusCircle, ClipboardList, ShoppingCart } from 'lucide-react';

type TabType = 'add' | 'list' | 'logistics_add' | 'logistics_list';

interface EmployeeBottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  {
    id: 'add' as TabType,
    label: 'Inventaris',
    sublabel: 'Tambah',
    icon: PlusCircle,
  },
  {
    id: 'list' as TabType,
    label: 'Inventaris',
    sublabel: 'Daftar',
    icon: ClipboardList,
  },
  {
    id: 'logistics_add' as TabType,
    label: 'Logistik',
    sublabel: 'Tambah',
    icon: ShoppingCart,
  },
  {
    id: 'logistics_list' as TabType,
    label: 'Logistik',
    sublabel: 'Daftar',
    icon: ClipboardList,
  },
];

export function EmployeeBottomNav({ activeTab, onTabChange }: EmployeeBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EAE4D9] shadow-lg">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                isActive ? 'text-[#B8860B] font-bold' : 'text-[#70685C] hover:text-[#231F1A]'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 w-10 h-1 bg-[#B8860B] rounded-b-full" />
              )}
              <Icon className={`w-4.5 h-4.5 ${isActive ? 'stroke-[2.5]' : ''}`} style={{ width: 18, height: 18 }} />
              <span className="text-[9px] leading-tight font-semibold">{tab.sublabel}</span>
              <span className={`text-[9px] leading-tight ${isActive ? 'text-[#B8860B]' : 'text-[#A09888]'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
