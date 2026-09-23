import Link from "next/link";
import { Plus, Search, Download, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ownedScope, visibleTeamUsers } from "@/lib/scope";
import { Card } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { AvatarWithName } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyForm } from "@/components/companies/company-form";
import { createCompany } from "@/lib/actions/companies";
import { canWrite, type AccountStatus } from "@/lib/validations";
import { accountStatusTone } from "@/lib/badge-tones";
import { formatDate } from "@/lib/utils";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { accountStatusLabel } from "@/i18n/enum-labels";

const PAGE_SIZE = 20;

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const { q, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const where = {
    ...(await ownedScope(user)),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { website: { contains: q } },
            { industry: { contains: q } },
          ],
        }
      : {}),
  };

  const [companies, total, owners] = await Promise.all([
    prisma.company.findMany({
      where,
      include: { owner: true, _count: { select: { contacts: true, opportunities: true } } },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.company.count({ where }),
    visibleTeamUsers(user),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{dict.companies.title}</h1>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/api/export/companies" variant="secondary">
            <Download className="size-4" />
            {dict.companies.exportCsv}
          </LinkButton>
          {canWrite(user.role) ? (
            <ModalFormTrigger
              title={dict.companies.newAccount}
              trigger={
                <Button>
                  <Plus className="size-4" />
                  {dict.companies.newAccount}
                </Button>
              }
            >
              <CompanyForm action={createCompany} currentUser={user} owners={owners} submitLabel={dict.companies.saveAccount} />
            </ModalFormTrigger>
          ) : null}
        </div>
      </div>

      <Card>
        <form className="flex flex-wrap gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-48">
            <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted" />
            <Input name="q" defaultValue={q} placeholder={dict.companies.searchPlaceholder} className="ps-9" />
          </div>
          <Button type="submit">{dict.common.filter}</Button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-muted">
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.companies.colName}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.companies.colStatus}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.companies.colIndustry}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.companies.colContacts}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.companies.colOpportunities}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.companies.colOwner}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.companies.colCreated}</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-border transition-colors last:border-0 hover:bg-background">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                    {c.website ? <div className="text-xs text-muted">{c.website}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={accountStatusTone[c.accountStatus as AccountStatus] ?? "default"}>
                      {accountStatusLabel(dict, c.accountStatus)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{c.industry || "—"}</td>
                  <td className="px-4 py-3 text-muted">{c._count.contacts}</td>
                  <td className="px-4 py-3 text-muted">{c._count.opportunities}</td>
                  <td className="px-4 py-3 text-muted">
                    <AvatarWithName name={c.owner.name} />
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={Building2} message={dict.companies.emptyState} />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <Pagination total={total} pageSize={PAGE_SIZE} currentPage={currentPage} />
      </Card>
    </div>
  );
}
