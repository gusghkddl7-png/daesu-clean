// components/dashboard/QuickTiles.tsx
import Link from "next/link";

type Tile = { href: string; label: string; desc?: string };
const tiles: Tile[] = [
  { href: "/settings", label: "설정", desc: "직원 승인 · 공지 · 입력동작" },
  // 필요하면 여기 아래로 타일을 더 추가하세요.
];

export default function QuickTiles() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {tiles.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="border rounded-2xl p-4 bg-white hover:bg-gray-50 transition"
        >
          <div className="text-base font-semibold">{t.label}</div>
          {t.desc && <div className="text-xs text-gray-500 mt-1">{t.desc}</div>}
        </Link>
      ))}
    </div>
  );
}
