import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton cols={6} />
    </div>
  );
}
