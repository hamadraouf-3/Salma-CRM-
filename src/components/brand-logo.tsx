import { cn } from "@/lib/utils";

function PencilRule({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 12" className={cn("shrink-0 text-[var(--logo)]", className)} aria-hidden>
      <path d="M1 7.5h52" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M53 7.5 64 3.4v8.2L53 7.5Z" fill="currentColor" />
      <path d="M64 4.2 70 7.5 64 10.8" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function BrandLogo({
  alt,
  size = "md",
  className,
}: {
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const word = {
    sm: "text-[1.45rem]",
    md: "text-[1.85rem]",
    lg: "text-[2.65rem]",
  }[size];
  const rule = {
    sm: "h-2.5 w-14",
    md: "h-3 w-[4.5rem]",
    lg: "h-3.5 w-24",
  }[size];

  return (
    <span className={cn("inline-flex flex-col items-start", className)} role="img" aria-label={alt}>
      <span className={cn("font-logo font-semibold leading-none tracking-tight text-[var(--logo)]", word)} aria-hidden>
        موضوع
      </span>
      <span className="mt-2 flex items-center gap-3" aria-hidden>
        <PencilRule className={rule} />
        <span className="font-sans text-[10px] font-semibold tracking-[0.34em] text-[var(--accent)]">CRM</span>
      </span>
    </span>
  );
}
