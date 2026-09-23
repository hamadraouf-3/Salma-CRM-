"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDict } from "@/i18n/locale-context";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const dict = useDict();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });

      if (result?.error) {
        setError(dict.login.invalidCredentials);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>
      ) : null}
      <Field label={dict.login.emailAddress} htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label={dict.login.password} htmlFor="password">
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </Field>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? dict.login.signingIn : dict.login.signIn}
      </Button>
    </form>
  );
}
