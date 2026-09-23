import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { FlashToast } from "@/components/flash-toast";
import { RevealTableStart } from "@/components/reveal-table-start";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex h-screen w-full overflow-hidden print:h-auto print:overflow-visible">
      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
      <RevealTableStart />
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <Topbar name={user.name ?? user.email ?? "User"} role={user.role} userId={user.id} />
        <main className="flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5 md:p-6 print:overflow-visible print:p-0">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
