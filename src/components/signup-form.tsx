"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDict } from "@/i18n/locale-context";
import { signUp } from "@/lib/actions/signup";

export function SignUpForm() {
  const dict = useDict();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await signUp(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      const signedIn = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });

      if (signedIn?.error) {
        router.push("/login");
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-4">
      {error ? <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div> : null}
      <Field label={dict.signup.name} htmlFor="name">
        <Input id="name" name="name" required autoComplete="name" />
      </Field>
      <Field label={dict.login.emailAddress} htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label={dict.login.password} htmlFor="password">
        <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={6} />
      </Field>
      <Field label={dict.signup.confirmPassword} htmlFor="confirmPassword">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          minLength={6}
        />
      </Field>
      <Button type="submit" className="mt-2 h-12 w-full" disabled={isPending}>
        {isPending ? dict.signup.submitting : dict.signup.submit}
      </Button>
    </form>
  );
}
