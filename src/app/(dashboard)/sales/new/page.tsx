import { redirect } from "next/navigation";
import { Handshake } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ownedScope, visibleTeamUsers } from "@/lib/scope";
import { canWrite } from "@/lib/validations";
import { SalesOpportunityForm } from "@/components/sales/sales-opportunity-form";
import { getPipelineStages } from "@/lib/pipeline-stages";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";

export default async function NewSalesOpportunityPage() {
  const user = await requireUser();
  if (!canWrite(user.role)) redirect("/opportunities");
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [owners, companies, contacts, stages] = await Promise.all([
    visibleTeamUsers(user),
    prisma.company.findMany({
      where: await ownedScope(user),
      orderBy: { name: "asc" },
      select: { id: true, name: true, industry: true, website: true, companySize: true, country: true, city: true, accountStatus: true },
    }),
    prisma.contact.findMany({
      where: await ownedScope(user),
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, jobTitle: true, companyId: true },
    }),
    getPipelineStages(),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-sm shadow-primary/30">
          <Handshake className="size-5" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">{dict.sales.pageTitle}</h1>
      </div>
      <SalesOpportunityForm currentUser={user} owners={owners} companies={companies} contacts={contacts} stages={stages} />
    </div>
  );
}
