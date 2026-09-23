import { requireUser } from "@/lib/session";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/change-password-form";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { roleLabel } from "@/i18n/enum-labels";

export default async function ProfilePage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">{dict.profile.title}</h1>

      <Card>
        <CardHeader title={dict.profile.account} />
        <CardBody className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">{dict.fields.name}</span>
            <span className="text-foreground">{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{dict.fields.email}</span>
            <span className="text-foreground">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{dict.fields.role}</span>
            <span className="text-foreground">{roleLabel(dict, user.role)}</span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={dict.profile.changePassword} />
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}
