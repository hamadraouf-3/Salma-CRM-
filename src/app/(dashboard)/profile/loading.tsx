import { PageHeaderSkeleton, CardListSkeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="max-w-xl space-y-6">
      <PageHeaderSkeleton withAction={false} />
      <CardListSkeleton count={2} />
    </div>
  );
}
