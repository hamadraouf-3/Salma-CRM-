import { LoginForm } from "@/components/login-form";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className="auth-backdrop flex min-h-screen items-center justify-center bg-background px-4">
      <div className="animate-modal-in w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-[var(--shadow-card-hover)]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-xl font-bold text-primary-foreground shadow-sm shadow-primary/30">
            S
          </div>
          <h1 className="text-xl font-semibold text-foreground">{dict.login.signIn}</h1>
          <p className="mt-1 text-sm text-muted">{dict.brand.name}</p>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
