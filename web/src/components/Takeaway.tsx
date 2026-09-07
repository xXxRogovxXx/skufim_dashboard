import type { ReactNode } from "react";

export default function Takeaway({ children }: { children: ReactNode }) {
  return (
    <div className="takeaway">
      <span className="takeaway__tag">📌 Вывод</span>
      <span>{children}</span>
    </div>
  );
}
