import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function OpportunitiesListLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton cols={7} />
    </div>
  );
}
