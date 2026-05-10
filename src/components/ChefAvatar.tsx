"use client";

const defaultAvatars: Record<string, string> = {
  Olivia: "👩‍🍳",
  Darcey: "👩",
  Annika: "🧑‍🍳",
  Emma: "👧",
  Isabel: "👶",
  Scott: "👨‍🍳",
};

interface ChefAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  linked?: boolean;
}

const sizeClasses = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
  xl: "w-16 h-16 text-2xl",
};

export default function ChefAvatar({
  name,
  avatarUrl,
  size = "md",
  linked = true,
}: ChefAvatarProps) {
  // Try uploaded avatar, then /public/avatars/ fallback, then emoji
  const publicAvatar = `/avatars/${name.toLowerCase()}.jpg`;

  const content = (
    <div
      className={`${sizeClasses[size]} rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700`}
      title={name}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fall back to public avatar
            const img = e.target as HTMLImageElement;
            if (!img.src.includes("/avatars/")) {
              img.src = publicAvatar;
            } else {
              // Fall back to emoji
              img.style.display = "none";
              img.parentElement!.innerHTML = `<span>${defaultAvatars[name] || "🍴"}</span>`;
            }
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={publicAvatar}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = "none";
            img.parentElement!.innerHTML = `<span>${defaultAvatars[name] || "🍴"}</span>`;
          }}
        />
      )}
    </div>
  );

  if (linked) {
    return (
      <a
        href={`/chef/${encodeURIComponent(name)}`}
        className="hover:opacity-80 transition-opacity"
      >
        {content}
      </a>
    );
  }

  return content;
}
