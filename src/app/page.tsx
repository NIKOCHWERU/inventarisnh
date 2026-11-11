import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { HomeClientDispatcher } from '@/components/portal/HomeClientDispatcher';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    if (user.role === 'Admin') {
      redirect('/admin');
    }
    redirect('/portal');
  }

  // If no server cookie, run client-side device check before falling back to /login
  return <HomeClientDispatcher />;
}
