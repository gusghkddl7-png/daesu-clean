import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
