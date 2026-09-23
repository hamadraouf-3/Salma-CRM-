import { PageHeaderSkeleton, CardListSkeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withAction={false} />
      <CardListSkeleton count={4} />
    </div>
  );
}
