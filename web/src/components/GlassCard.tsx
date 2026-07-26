import type { ReactNode, CSSProperties } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: CSSProperties;
}

export default function GlassCard({ children, className = "", hover = true, style }: Props) {
  return (
    <div
      className={`glass ${hover ? "glass--hover" : ""} section ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
