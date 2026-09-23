import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "size-6 text-xs",
  md: "size-8 text-sm",
} as const;

export function Avatar({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        SIZE_CLASSES[size],
        className
      )}
    >
      {name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

export function AvatarWithName({ name, size = "sm" }: { name: string; size?: keyof typeof SIZE_CLASSES }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar name={name} size={size} />
      {name}
    </span>
  );
}
