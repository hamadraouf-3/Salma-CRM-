import "server-only";
import { getLocale } from "./locale";
import { getDictionary, type Dictionary } from "./dictionaries";

/** Shorthand for `getDictionary(await getLocale())`, used throughout Server Actions and Route Handlers. */
export async function getServerDict(): Promise<Dictionary> {
  return getDictionary(await getLocale());
}
