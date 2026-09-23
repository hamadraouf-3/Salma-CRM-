import { cn } from "@/lib/utils";

export function BrandLogo({
  alt,
  size = "md",
  className,
}: {
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const height = {
    sm: "h-8",
    md: "h-11",
    lg: "h-16",
  }[size];

  return (
    <img
      src="/mawdoo3-logo.png"
      alt={alt}
      className={cn("w-auto object-contain", height, className)}
    />
  );
}
