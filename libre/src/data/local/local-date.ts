const pad2 = (n: number): string => String(n).padStart(2, "0");

/** 端末のタイムゾーンの日付を `YYYY-MM-DD` にする。`toISOString` は UTC の日付になるので使わない */
export const localDateString = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
