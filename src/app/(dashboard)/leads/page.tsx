import Link from "next/link";
import { Plus, Search, Flame } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ownedScope, visibleTeamUsers } from "@/lib/scope";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { AvatarWithName } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { LeadForm } from "@/components/leads/lead-form";
import { createLead, deleteLead } from "@/lib/actions/leads";
import { LEAD_STATUSES, canWrite, type LeadStatus } from "@/lib/validations";
import { leadStatusTone } from "@/lib/badge-tones";
import { formatDate } from "@/lib/utils";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { leadStatusLabel } from "@/i18n/enum-labels";

const PAGE_SIZE = 20;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const { q, status, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const where = {
    ...(await ownedScope(user)),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { companyName: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
  };

  const [leads, total, owners] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { owner: true },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.lead.count({ where }),
    visibleTeamUsers(user),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{dict.leads.title}</h1>
        </div>
        {canWrite(user.role) ? (
          <ModalFormTrigger
            title={dict.leads.newLead}
            trigger={
              <Button>
                <Plus className="size-4" />
                {dict.leads.newLead}
              </Button>
            }
          >
            <LeadForm action={createLead} currentUser={user} owners={owners} submitLabel={dict.leads.saveLead} />
          </ModalFormTrigger>
        ) : null}
      </div>

      <Card>
        <form className="flex flex-wrap gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-48">
            <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted" />
            <Input name="q" defaultValue={q} placeholder={dict.leads.searchPlaceholder} className="ps-9" />
          </div>
          <Select name="status" defaultValue={status ?? ""} className="w-44">
            <option value="">{dict.leads.allStatuses}</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {leadStatusLabel(dict, s)}
              </option>
            ))}
          </Select>
          <Button type="submit">{dict.common.filter}</Button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-muted">
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.leads.colName}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.leads.colCompany}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.leads.colStatus}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.leads.colScore}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.leads.colOwner}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.leads.colNextFollowUp}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.leads.colCreated}</th>
                {canWrite(user.role) ? <th className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="group border-b border-border transition-colors last:border-0 hover:bg-background">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${l.id}`} className="font-medium text-primary hover:underline">
                      {l.name}
                    </Link>
                    {l.email ? <div className="text-xs text-muted">{l.email}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-muted">{l.companyName || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={leadStatusTone[l.status as LeadStatus] ?? "default"}>
                      {leadStatusLabel(dict, l.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{l.score}</td>
                  <td className="px-4 py-3 text-muted">
                    <AvatarWithName name={l.owner.name} />
                  </td>
                  <td className="px-4 py-3 text-muted">{l.nextFollowUpAt ? formatDate(l.nextFollowUpAt) : "—"}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(l.createdAt)}</td>
                  {canWrite(user.role) ? (
                    <td className="px-4 py-3 text-end">
                      {l.status !== "CONVERTED" ? (
                        <span className="inline-flex opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                          <ConfirmDeleteForm
                            action={deleteLead.bind(null, l.id)}
                            confirmMessage={dict.leads.deleteConfirm}
                            label={dict.common.delete}
                            iconOnly
                          />
                        </span>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={canWrite(user.role) ? 8 : 7}>
                    <EmptyState icon={Flame} message={dict.leads.emptyState} />
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
