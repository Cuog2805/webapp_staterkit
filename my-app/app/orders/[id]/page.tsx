import { Suspense } from "react";
import OrderDetailClient from "./OrderDetailClient";

// Route phụ thuộc tham số động + dữ liệu runtime (auth/fetch phía client) → không prerender tĩnh.
export const instant = false;

export default async function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="p-8 text-sm text-black/60 dark:text-white/60">Đang tải...</div>}>
      <OrderDetailClient id={id} />
    </Suspense>
  );
}
