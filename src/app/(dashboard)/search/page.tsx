import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ownedScope, opportunityScope } from "@/lib/scope";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { plural } from "@/i18n/plural";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const scope = await ownedScope(user);
  const oppScope = await opportunityScope(user);
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [leads, contacts, companies, opportunities] = query
    ? await Promise.all([
        prisma.lead.findMany({
          where: { ...scope, OR: [{ name: { contains: query } }, { companyName: { contains: query } }, { email: { contains: query } }] },
          take: 10,
        }),
        prisma.contact.findMany({
          where: { ...scope, OR: [{ name: { contains: query } }, { email: { contains: query } }] },
          take: 10,
        }),
        prisma.company.findMany({
          where: { ...scope, name: { contains: query } },
          take: 10,
        }),
        prisma.opportunity.findMany({
          where: { ...oppScope, title: { contains: query } },
          take: 10,
        }),
      ])
    : [[], [], [], []];

  const totalResults = leads.length + contacts.length + companies.length + opportunities.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{dict.search.title}</h1>
        <p className="text-sm text-muted">
          {query ? plural(locale, totalResults, dict.search.resultsFor).replace("{query}", query) : dict.search.typeToStart}
        </p>
      </div>

      {query ? (
        <div className="space-y-6">
          <Card>
            <CardHeader title={dict.tasks.groupHeader.replace("{title}", dict.search.leads).replace("{count}", String(leads.length))} />
            <CardBody className="space-y-2">
              {leads.map((l) => (
                <Link
                  key={l.id}
                  href={`/leads/${l.id}`}
                  className="block rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
                >
                  <span className="font-medium text-foreground">{l.name}</span>
                  {l.companyName ? <span className="ms-2 text-muted">{l.companyName}</span> : null}
                </Link>
              ))}
              {leads.length === 0 ? <p className="py-2 text-sm text-muted">{dict.search.noMatchingLeads}</p> : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={dict.tasks.groupHeader.replace("{title}", dict.search.contacts).replace("{count}", String(contacts.length))} />
            <CardBody className="space-y-2">
              {contacts.map((c) => (
                <Link
                  key={c.id}
                  href={`/contacts/${c.id}`}
                  className="block rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
                >
                  <span className="font-medium text-foreground">{c.name}</span>
                  {c.email ? <span className="ms-2 text-muted">{c.email}</span> : null}
                </Link>
              ))}
              {contacts.length === 0 ? <p className="py-2 text-sm text-muted">{dict.search.noMatchingContacts}</p> : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={dict.tasks.groupHeader.replace("{title}", dict.search.accounts).replace("{count}", String(companies.length))} />
            <CardBody className="space-y-2">
              {companies.map((c) => (
                <Link
                  key={c.id}
                  href={`/companies/${c.id}`}
                  className="block rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
                >
                  <span className="font-medium text-foreground">{c.name}</span>
                  {c.industry ? <span className="ms-2 text-muted">{c.industry}</span> : null}
                </Link>
              ))}
              {companies.length === 0 ? <p className="py-2 text-sm text-muted">{dict.search.noMatchingAccounts}</p> : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={dict.tasks.groupHeader.replace("{title}", dict.search.opportunities).replace("{count}", String(opportunities.length))} />
            <CardBody className="space-y-2">
              {opportunities.map((o) => (
                <Link
                  key={o.id}
                  href={`/opportunities/${o.id}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
                >
                  <span className="font-medium text-foreground">{o.title}</span>
                  <span className="text-muted">{formatCurrency(o.value, o.currency)}</span>
                </Link>
              ))}
              {opportunities.length === 0 ? <p className="py-2 text-sm text-muted">{dict.search.noMatchingOpportunities}</p> : null}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
