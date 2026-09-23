import Image from "next/image";
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
          <Image
            src="/logo.png"
            alt={dict.brand.name}
            width={450}
            height={137}
            className="mx-auto mb-4 h-12 w-auto"
            priority
          />
          <h1 className="text-xl font-semibold text-foreground">{dict.login.signIn}</h1>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
