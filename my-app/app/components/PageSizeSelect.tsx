"use client";

import { PAGE_SIZE_OPTIONS } from "@/lib/labels";

/** Dropdown chọn số dòng mỗi trang (10/20/50/100). */
export default function PageSizeSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (size: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
      Hiển thị
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ui-select rounded-md border border-black/15 px-2 py-1 text-foreground dark:border-white/20"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}/trang
          </option>
        ))}
      </select>
    </label>
  );
}
