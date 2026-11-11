'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { withBasePath } from '@/lib/base-path';

export function HomeClientDispatcher() {
  const router = useRouter();

  useEffect(() => {
    async function checkDevice() {
      try {
        const token = localStorage.getItem('kantor_device_session_token');
        const userId = localStorage.getItem('kantor_device_user_id');
        const name = localStorage.getItem('kantor_device_user_name');

        if (token || userId) {
          const res = await fetch('/api/auth/restore-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken: token || undefined, userId: userId || undefined }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.user) {
            if (data.sessionToken) {
              localStorage.setItem('kantor_device_session_token', data.sessionToken);
            }
            window.location.href = withBasePath(data.user.role === 'Admin' ? '/admin' : '/portal');
            return;
          }
        }

        // If this device was previously used by an employee, go to portal instead of admin login
        if (name || userId) {
          router.replace('/portal');
          return;
        }
      } catch (e) {
        console.error('Home dispatcher restore error:', e);
      }
      router.replace('/login');
    }

    checkDevice();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#70685C]">Mengarahkan ke aplikasi...</p>
      </div>
    </div>
  );
}
