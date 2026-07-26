import type { ReactNode } from "react";

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="section-title">{children}</div>;
}

export function Hint({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="hint">
      <strong>💡 {title}</strong> — {children}
    </div>
  );
}
