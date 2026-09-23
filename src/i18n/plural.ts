import type { Locale } from "./locale";

type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>>;

/** Picks the right plural form for `count` in `locale` (English: one/other; Arabic: zero/one/two/few/many/other) and fills in {count}. */
export function plural(locale: Locale, count: number, forms: PluralForms): string {
  const category = new Intl.PluralRules(locale).select(count);
  const template = forms[category] ?? forms.other ?? "";
  return template.replace("{count}", String(count));
}
