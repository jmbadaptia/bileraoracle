const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-violet-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
];

function colorForName(name: string) {
  let hash = 0;
  for (const c of name) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

interface AvatarGroupProps {
  people: { id: string; name: string }[];
  max?: number;
  size?: "sm" | "md";
}

export function AvatarGroup({ people, max = 5, size = "sm" }: AvatarGroupProps) {
  if (!people || people.length === 0) return null;

  const visible = people.slice(0, max);
  const overflow = people.length - max;

  const sizeClasses = size === "sm"
    ? "h-6 w-6 text-[9px]"
    : "h-8 w-8 text-[10px]";

  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        {visible.map((person) => (
          <div
            key={person.id}
            title={person.name}
            className={`${colorForName(person.name)} ${sizeClasses} rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-background`}
          >
            {getInitials(person.name)}
          </div>
        ))}
        {overflow > 0 && (
          <div
            className={`bg-muted ${sizeClasses} rounded-full flex items-center justify-center text-muted-foreground font-semibold ring-2 ring-background`}
            title={people.slice(max).map((p) => p.name).join(", ")}
          >
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}
