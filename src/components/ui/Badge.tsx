import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'baik' | 'rusakRingan' | 'rusakBerat' | 'perbaikan' | 'active' | 'inactive' | 'used' | 'revoked' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  let styleClasses = 'bg-[#F4F0E8] text-[#70685C] border-[#EAE4D9]';

  switch (variant) {
    case 'baik':
    case 'active':
      styleClasses = 'bg-[#EBF5ED] text-[#2B6336] border-[#C2E2CA]';
      break;
    case 'rusakRingan':
      styleClasses = 'bg-[#FEF7E6] text-[#A36B00] border-[#FBE3B5]';
      break;
    case 'rusakBerat':
    case 'revoked':
      styleClasses = 'bg-[#FDF2F2] text-[#C53030] border-[#F8C4C4]';
      break;
    case 'perbaikan':
      styleClasses = 'bg-[#F2F5FD] text-[#2B52BA] border-[#C7D7FB]';
      break;
    case 'inactive':
      styleClasses = 'bg-[#F4F4F5] text-[#71717A] border-[#E4E4E7]';
      break;
    case 'used':
      styleClasses = 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styleClasses} ${className}`}
    >
      {children}
    </span>
  );
}

export function ConditionBadge({ condition }: { condition: string }) {
  let variant: BadgeProps['variant'] = 'default';
  const c = (condition || '').toLowerCase();
  
  if (c === 'baik' || c.includes('bagus') || c.includes('baru') || c.includes('segel') || c.includes('normal') || c.includes('mulus')) {
    variant = 'baik';
  } else if (c === 'rusak ringan' || c.includes('ringan') || c.includes('lecet') || c.includes('baret') || c.includes('bekas')) {
    variant = 'rusakRingan';
  } else if (c === 'rusak berat' || c.includes('berat') || c.includes('mati') || c.includes('pecah') || c.includes('patah') || c.includes('rusak')) {
    variant = 'rusakBerat';
  } else if (c === 'perlu perbaikan' || c.includes('perlu') || c.includes('servis') || c.includes('service') || c.includes('perbaikan')) {
    variant = 'perbaikan';
  }

  return <Badge variant={variant}>{condition || 'Baik'}</Badge>;
}
