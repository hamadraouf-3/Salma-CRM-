import { requireUser } from "@/lib/session";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ImportForm } from "@/components/contacts/import-form";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";

export default async function ImportContactsPage() {
  await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">{dict.contacts.importTitle}</h1>
      <Card>
        <CardHeader
          title={dict.contacts.uploadCsv}
          description={dict.contacts.csvColumnsDesc}
        />
        <CardBody className="space-y-4">
          <p className="text-sm text-muted">
            {dict.contacts.importDesc}
          </p>
          <ImportForm />
        </CardBody>
      </Card>
      <LinkButton href="/contacts" variant="secondary">
        {dict.contacts.backToContacts}
      </LinkButton>
    </div>
  );
}
