import "server-only";
import type { Dictionary } from "./dictionaries";
import type { StageGateFailure } from "@/lib/validations";

/**
 * Server Actions build flash/error strings as plain English literals (e.g. `"Lead not found"`).
 * This looks the exact text up in the active locale's `messages` dictionary, falling back to the
 * original English if no translation exists yet — a missing key degrades to English instead of
 * surfacing a raw dictionary path to the user.
 */
export function translateMessage(dict: Dictionary, text: string): string {
  return (dict.messages as unknown as Record<string, string>)[text] ?? text;
}

/**
 * Turns a `stageGateCheck` failure (see `src/lib/validations.ts`) into a localized message.
 * `stageDisplayLabel` is the gated stage's own label — gated stages are always admin-added custom
 * stages (NEW/WON/LOST are never gated), so the caller passes the PipelineStage row's free-text
 * `label` straight through rather than a dictionary lookup.
 */
export function stageGateMessage(dict: Dictionary, failure: StageGateFailure, stageDisplayLabel: string): string {
  const template = failure.missing === "value" ? dict.messages.stageGateValue : dict.messages.stageGateNextAction;
  return template.replace("{stage}", stageDisplayLabel);
}
