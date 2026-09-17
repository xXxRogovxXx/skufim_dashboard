import { IUV_HOW, IUV_MEANS, IUV_TITLE } from "../lib/iuv";

// Единое пояснение к метрике ИУВ — ставим рядом везде, где она показана.
export default function IuvNote() {
  return (
    <div className="hint">
      <strong>💡 {IUV_TITLE}</strong> — {IUV_HOW} {IUV_MEANS}
    </div>
  );
}
