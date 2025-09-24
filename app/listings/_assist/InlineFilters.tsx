"use client";
import React from "react";

/** 빌드용 간단 더미. 추후 실제 필터 UI로 교체 가능 */
export type InlineFiltersProps = {
  value?: unknown;
  onChange?: (v: unknown) => void;
  className?: string;
};
export default function InlineFilters(_props: InlineFiltersProps) {
  // 화면에 아무것도 렌더하지 않음. 필요하면 UI 추가.
  return null;
}

