const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** ISO 8601 → 端末ローカルの日付キー (例: "2026-07-04") */
export function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 日付キー → 表示ラベル (例: "2026年7月4日 (金)") */
export function dateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${y}年${m}月${d}日 (${weekday})`;
}

/** ISO 8601 → 端末ローカルの時刻 (例: "18:30") */
export function localTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 重量の表示 (自重 = 0kg は「自重」と表示) */
export function weightLabel(weight: number): string {
  return weight === 0 ? '自重' : `${weight}kg`;
}
