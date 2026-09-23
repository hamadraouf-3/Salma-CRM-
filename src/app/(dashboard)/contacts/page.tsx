import Link from "next/link";
import { Plus, Search, Download, Upload, ChevronUp, ChevronDown, Mail, Phone as PhoneIcon, Pencil, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ownedScope, visibleTeamUsers } from "@/lib/scope";
import { Card } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { AvatarWithName } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ContactForm } from "@/components/contacts/contact-form";
import { createContact, updateContact } from "@/lib/actions/contacts";
import {
  CONTACT_STATUSES,
  canWrite,
  type ContactStatus,
} from "@/lib/validations";
import { contactStatusTone } from "@/lib/badge-tones";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { plural } from "@/i18n/plural";
import { contactStatusLabel } from "@/i18n/enum-labels";

const PAGE_SIZE = 20;
const SORTABLE = ["name", "status"] as const;
type SortField = (typeof SORTABLE)[number];

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tag?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const { q, status, tag, sort, dir, page } = await searchParams;

  const sortField: SortField = SORTABLE.includes(sort as SortField) ? (sort as SortField) : "name";
  const sortDir: "asc" | "desc" = dir === "desc" ? "desc" : "asc";
  const currentPage = Math.max(1, Number(page) || 1);

  const where = {
    ...(await ownedScope(user)),
    ...(status ? { status } : {}),
    ...(tag ? { tags: { some: { name: tag } } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
            { company: { name: { contains: q } } },
          ],
        }
      : {}),
  };

  const [contacts, total, allTags, owners, companies] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { owner: true, company: true, tags: true },
      orderBy: { [sortField]: sortDir },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.contact.count({ where }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    visibleTeamUsers(user),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  function sortHref(field: SortField) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (tag) params.set("tag", tag);
    params.set("sort", field);
    params.set("dir", sortField === field && sortDir === "asc" ? "desc" : "asc");
    return `/contacts?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{dict.contacts.title}</h1>
          <p className="text-sm text-muted">
            {plural(locale, total, dict.contacts.countLabel)}
          </p>
        </div>
        <div className="flex gap-2">
          {canWrite(user.role) ? (
            <LinkButton href="/contacts/import" variant="secondary">
              <Upload className="size-4" />
              {dict.contacts.importCsv}
            </LinkButton>
          ) : null}
          <LinkButton href="/api/export/contacts" variant="secondary">
            <Download className="size-4" />
            {dict.contacts.exportCsv}
          </LinkButton>
          {canWrite(user.role) ? (
            <ModalFormTrigger
              title={dict.contacts.newContact}
              trigger={
                <Button>
                  <Plus className="size-4" />
                  {dict.contacts.newContact}
                </Button>
              }
            >
              <ContactForm
                action={createContact}
                currentUser={user}
                owners={owners}
                companies={companies}
                submitLabel={dict.contacts.saveContact}
              />
            </ModalFormTrigger>
          ) : null}
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="size-4 text-muted" />
            {dict.contacts.allContactsHeader}
          </div>
          <form className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <div className="relative w-full max-w-64 sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted" />
              <Input name="q" defaultValue={q} placeholder={dict.contacts.searchPlaceholder} className="h-9 ps-9" />
            </div>
            <Select name="status" defaultValue={status ?? ""} className="h-9 w-40">
              <option value="">{dict.contacts.allStatuses}</option>
              {CONTACT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {contactStatusLabel(dict, s)}
                </option>
              ))}
            </Select>
            {allTags.length > 0 ? (
              <Select name="tag" defaultValue={tag ?? ""} className="h-9 w-36">
                <option value="">{dict.contacts.allTags}</option>
                {allTags.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </Select>
            ) : null}
            <Button type="submit" variant="secondary" size="sm" className="h-9">
              {dict.common.filter}
            </Button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 text-start font-medium">
                  <Link href={sortHref("name")} className="inline-flex items-center gap-1 hover:text-foreground">
                    {dict.contacts.colName}
                    {sortField === "name" ? (
                      sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
                    ) : null}
                  </Link>
                </th>
                <th className="px-4 py-3 text-start font-medium">{dict.contacts.colAccountName}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.contacts.colPhone}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.contacts.colEmail}</th>
                <th className="px-4 py-3 text-start font-medium">
                  <Link href={sortHref("status")} className="inline-flex items-center gap-1 hover:text-foreground">
                    {dict.contacts.colStatus}
                    {sortField === "status" ? (
                      sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
                    ) : null}
                  </Link>
                </th>
                <th className="px-4 py-3 text-start font-medium">{dict.contacts.colOwner}</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="group border-b border-border transition-colors last:border-0 hover:bg-background">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.company ? (
                      <Link href={`/companies/${c.company.id}`} className="hover:underline">
                        {c.company.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.phone ? (
                      <span className="inline-flex items-center gap-1.5">
                        <PhoneIcon className="size-3.5 text-muted" />
                        {c.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                        <Mail className="size-3.5" />
                        {c.email}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={contactStatusTone[c.status as ContactStatus] ?? "default"}>
                      {contactStatusLabel(dict, c.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    <AvatarWithName name={c.owner.name} />
                  </td>
                  <td className="px-4 py-3 text-end">
                    <ModalFormTrigger
                      title={dict.contacts.editTitle}
                      trigger={
                        <button
                          type="button"
                          className="inline-flex rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-background"
                          aria-label={dict.contacts.editContactAria}
                        >
                          <Pencil className="size-4 text-muted hover:text-foreground" />
                        </button>
                      }
                    >
                      <ContactForm
                        action={updateContact.bind(null, c.id)}
                        currentUser={user}
                        owners={owners}
                        companies={companies}
                        defaultValues={{ ...c, tags: c.tags.map((t) => t.name).join(", ") }}
                        submitLabel={dict.common.saveChanges}
                      />
                    </ModalFormTrigger>
                  </td>
                </tr>
              ))}
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={Users} message={dict.contacts.emptyState} />
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
