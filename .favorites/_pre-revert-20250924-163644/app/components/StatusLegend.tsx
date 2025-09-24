"use client";

export default function StatusLegend() {
  const Item = ({ cls, text }: { cls: string; text: string }) => (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
      <span className={`w-3 h-3 rounded border ${cls}`} />
      <span>{text}</span>
    </span>
  );
  return (
    <div className="flex items-center gap-3">
      <Item cls="bg-red-200 border-red-300" text="10일 이내" />
      <Item cls="bg-orange-200 border-orange-300" text="20일 이내" />
      <Item cls="bg-sky-200 border-sky-300" text="30일 이내" />
    </div>
  );
}
