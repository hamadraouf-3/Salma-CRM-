import { Skeleton, AccordionFormSkeleton } from "@/components/ui/skeleton";

export default function NewSalesOpportunityLoading() {
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <Skeleton className="h-6 w-48" />
      </div>
      <AccordionFormSkeleton />
    </div>
  );
}
