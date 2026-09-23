import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ownedScope } from "@/lib/scope";
import { toCsv, csvResponse } from "@/lib/csv";
import { formatDate } from "@/lib/utils";
import { getServerDict } from "@/i18n/server-dict";
import { contactStatusLabel, sourceLabel } from "@/i18n/enum-labels";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const dict = await getServerDict();

  const contacts = await prisma.contact.findMany({
    where: await ownedScope(user),
    include: { owner: true, company: true, tags: true },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    contacts.map((c) => ({
      name: c.name,
      company: c.company?.name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      status: contactStatusLabel(dict, c.status),
      source: c.source ? sourceLabel(dict, c.source) : "",
      tags: c.tags.map((t) => t.name).join("; "),
      owner: c.owner.name,
      createdAt: formatDate(c.createdAt),
    })),
    [
      { key: "name", label: dict.fields.name },
      { key: "company", label: dict.fields.company },
      { key: "email", label: dict.fields.email },
      { key: "phone", label: dict.fields.phone },
      { key: "status", label: dict.fields.status },
      { key: "source", label: dict.fields.source },
      { key: "tags", label: dict.fields.tags },
      { key: "owner", label: dict.fields.owner },
      { key: "createdAt", label: dict.fields.created },
    ]
  );

  return csvResponse(csv, "contacts.csv");
}
