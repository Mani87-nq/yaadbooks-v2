import { PageSkeleton } from '@/components/LoadingSkeleton';

export default function DashboardLoading() {
  return (
    <div className="p-6">
      <PageSkeleton />
    </div>
  );
}
