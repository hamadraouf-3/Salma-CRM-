import { Skeleton, StatCardsSkeleton, CardListSkeleton } from "@/components/ui/skeleton";

export default function DashboardHomeLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <StatCardsSkeleton count={5} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
      <CardListSkeleton count={4} />
    </div>
  );
}
