import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { Avatar } from "@/components/ui/avatar";
import { UserForm } from "@/components/users/user-form";
import { type Role } from "@/lib/validations";
import { createUser, updateUser, toggleUserActive } from "@/lib/actions/users";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { roleLabel } from "@/i18n/enum-labels";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  await requireRole("ADMIN");
  const { flash } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { contacts: true, opportunities: true, tasks: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{dict.users.title}</h1>
        </div>
        <div className="flex gap-2">
          <ModalFormTrigger
            title={dict.users.newUser}
            closeSignal={flash ?? null}
            trigger={
              <Button>
                <Plus className="size-4" />
                {dict.users.newUser}
              </Button>
            }
          >
            <UserForm action={createUser} submitLabel={dict.users.createAccount} isNew />
          </ModalFormTrigger>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.users.colName}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.users.colEmail}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.users.colRole}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.users.colContacts}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.users.colOpportunities}</th>
                <th className="px-4 py-3 text-start text-xs font-medium tracking-wide text-muted uppercase">{dict.users.colStatus}</th>
                <th className="px-4 py-3 text-start font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border transition-colors last:border-0 hover:bg-background">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} />
                      <div>
                        <div className="font-medium text-foreground">{u.name}</div>
                        {u.title ? <div className="text-xs text-muted">{u.title}</div> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone="primary">{roleLabel(dict, u.role as Role)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{u._count.contacts}</td>
                  <td className="px-4 py-3 text-muted">{u._count.opportunities}</td>
                  <td className="px-4 py-3">
                    <form action={toggleUserActive.bind(null, u.id, !u.active)}>
                      <button
                        type="submit"
                        className="cursor-pointer rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <Badge tone={u.active ? "success" : "danger"}>
                          {u.active ? dict.users.active : dict.users.disabled}
                        </Badge>
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <ModalFormTrigger
                      title={dict.users.editUserTitle}
                      closeSignal={flash ?? null}
                      trigger={
                        <Button variant="ghost" size="sm">
                          <Pencil className="size-4" />
                        </Button>
                      }
                    >
                      <UserForm action={updateUser.bind(null, u.id)} defaultValues={u} submitLabel={dict.common.saveChanges} />
                    </ModalFormTrigger>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
