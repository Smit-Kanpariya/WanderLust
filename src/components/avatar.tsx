import { avatarColors, initialsFor } from "@/lib/avatar";

const SIZES = {
  sm: "size-7 text-[0.7rem]",
  md: "size-9 text-sm",
  lg: "size-11 text-base",
} as const;

export function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const colors = avatarColors(name);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white ${SIZES[size]} ${className}`}
      style={{ backgroundColor: colors.background, color: colors.foreground }}
    >
      {initialsFor(name)}
    </span>
  );
}
