import { PageHeaderSkeleton, CardListSkeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withAction={false} />
      <CardListSkeleton count={6} />
    </div>
  );
}
