import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardLayoutClient } from './DashboardLayoutClient';

// All dashboard pages require auth — skip static prerendering
export const dynamic = 'force-dynamic';

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  
  // No token = redirect to login
  if (!accessToken) {
    redirect('/login');
  }
  
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
