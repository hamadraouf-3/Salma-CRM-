import { LoginForm } from "@/components/login-form";
import { BrandLogo } from "@/components/brand-logo";
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
    <div className="auth-shell flex min-h-dvh">
      <section className="auth-panel relative hidden w-[44%] flex-col justify-between overflow-hidden px-12 py-12 text-[#f6f1ea] lg:flex xl:px-16">
        <BrandLogo alt={dict.brand.name} size="lg" />
        <div className="max-w-sm">
          <div className="mb-6 h-px w-14 bg-[var(--accent)]" />
          <p className="text-4xl leading-tight font-medium tracking-tight">{dict.brand.name}</p>
        </div>
        <p className="text-[11px] font-medium tracking-[0.28em] text-white/55 uppercase">Mawdoo3</p>
      </section>

      <main className="flex flex-1 items-center justify-center bg-[var(--paper)] px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <BrandLogo alt={dict.brand.name} size="md" className="mb-8 lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dict.login.signIn}</h1>
          <p className="mt-1.5 mb-7 text-sm text-muted">{dict.brand.name}</p>
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </main>
    </div>
  );
}
