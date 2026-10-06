const PALETTE = [
  { background: "#dbeafe", foreground: "#1e40af" },
  { background: "#dcfce7", foreground: "#166534" },
  { background: "#fef3c7", foreground: "#92400e" },
  { background: "#fce7f3", foreground: "#9d174d" },
  { background: "#ede9fe", foreground: "#5b21b6" },
  { background: "#ccfbf1", foreground: "#115e59" },
  { background: "#ffedd5", foreground: "#9a3412" },
  { background: "#e0e7ff", foreground: "#3730a3" },
] as const;

/** Stable colour pair for a name, so the same person keeps the same avatar everywhere. */
export function avatarColors(name: string): (typeof PALETTE)[number] {
  let hash = 0;
  for (const char of name.trim().toLocaleLowerCase("en")) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0])[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
  return (first + last).toLocaleUpperCase("en");
}
