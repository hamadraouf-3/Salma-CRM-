import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ownedScope } from "@/lib/scope";
import { toCsv, csvResponse } from "@/lib/csv";
import { formatDate } from "@/lib/utils";
import { getServerDict } from "@/i18n/server-dict";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const dict = await getServerDict();

  const companies = await prisma.company.findMany({
    where: await ownedScope(user),
    include: { owner: true, _count: { select: { contacts: true } } },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    companies.map((c) => ({
      name: c.name,
      website: c.website ?? "",
      industry: c.industry ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      contacts: c._count.contacts,
      owner: c.owner.name,
      createdAt: formatDate(c.createdAt),
    })),
    [
      { key: "name", label: dict.fields.name },
      { key: "website", label: dict.fields.website },
      { key: "industry", label: dict.fields.industry },
      { key: "phone", label: dict.fields.phone },
      { key: "address", label: dict.fields.address },
      { key: "contacts", label: dict.fields.contactsCount },
      { key: "owner", label: dict.fields.owner },
      { key: "createdAt", label: dict.fields.created },
    ]
  );

  return csvResponse(csv, "companies.csv");
}
