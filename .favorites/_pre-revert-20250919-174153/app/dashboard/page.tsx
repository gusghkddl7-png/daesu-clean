// app/dashboard/page.tsx
import QuickTiles from "../../components/dashboard/QuickTiles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 space-y-6">
      <h1 className="text-xl font-semibold text-center">대시보드</h1>
      <QuickTiles />
    </main>
  );
}
