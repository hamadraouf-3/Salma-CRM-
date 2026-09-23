import { PageHeaderSkeleton, OpportunityRowsSkeleton } from "@/components/ui/skeleton";

export default function OpportunitiesLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <OpportunityRowsSkeleton />
    </div>
  );
}
