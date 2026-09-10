export function Avatar({ name, color, size = "size-12" }: { name: string; color: string; size?: string }) {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span aria-hidden className={`${size} flex shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white`} style={{ backgroundColor: color }}>{letters}</span>;
}
