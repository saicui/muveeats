import Link from "next/link";
import { Icon, type IconName } from "@/app/icons";

export type RecordType = "strength" | "cardio" | "activity";

const ITEMS: { type: RecordType; href: string; icon: IconName; label: string }[] = [
  { type: "strength", href: "/workouts/new", icon: "dumbbell", label: "筋トレ" },
  { type: "cardio", href: "/cardio/new", icon: "run", label: "有酸素" },
  { type: "activity", href: "/activity/new", icon: "footprints", label: "歩数" },
];

/**
 * 記録ページ間を行き来する小さな切り替えボタン群。
 * current 以外の 2 種類を右寄せで表示する。
 */
export function RecordSwitch({ current }: { current: RecordType }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
      {ITEMS.filter((i) => i.type !== current).map((o) => (
        <Link
          key={o.type}
          href={o.href}
          className="btn"
          style={{ padding: "5px 10px", fontSize: 11 }}
        >
          <Icon name={o.icon} size="sm" />
          {o.label}
        </Link>
      ))}
    </div>
  );
}
