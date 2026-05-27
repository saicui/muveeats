"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

type Item = {
  href: string;
  label: string;
  icon: IconName;
  /** href === pathname だけでなく、子配下も active 扱いするか */
  matchPrefix?: boolean;
};

const ITEMS: Item[] = [
  { href: "/", label: "ホーム", icon: "home" },
  { href: "/meals/new", label: "食事", icon: "fork", matchPrefix: true },
  { href: "/workouts", label: "運動", icon: "dumbbell", matchPrefix: true },
  { href: "/body", label: "体組成", icon: "scale", matchPrefix: true },
  { href: "/history", label: "履歴", icon: "book" },
  { href: "/settings", label: "設定", icon: "settings" },
];

function isActive(pathname: string, item: Item): boolean {
  if (item.href === "/") return pathname === "/";
  if (item.matchPrefix) return pathname.startsWith(item.href);
  return pathname === item.href;
}

/** クリック直後の pending を即座に視覚化するための inner wrapper。 */
function NavInner({ icon, label }: { icon: IconName; label: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={pending ? "nav-pending" : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        width: "100%",
      }}
    >
      <Icon name={icon} />
      {label}
    </span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={isActive(pathname, item) ? "active" : undefined}
        >
          <NavInner icon={item.icon} label={item.label} />
        </Link>
      ))}
    </nav>
  );
}
