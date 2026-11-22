const pad = (n: number, width = 2): string => String(n).padStart(width, "0");

/**
 * セッションに書く時刻の文字列を作る。時差付きの ISO 8601 で、秒まで書き、秒の小数は切り捨てる。
 *
 * @param date 書く時刻
 * @param timezoneOffsetMinutes UTC からの時差（分。東が正）。省略すると端末の時差
 * @returns 例: `2026-12-30T10:30:00+09:00`
 */
export const formatSessionTime = (
  date: Date,
  timezoneOffsetMinutes: number = -date.getTimezoneOffset(),
): string => {
  const shifted = new Date(date.getTime() + timezoneOffsetMinutes * 60_000);
  const sign = timezoneOffsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(timezoneOffsetMinutes);
  return (
    `${pad(shifted.getUTCFullYear(), 4)}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
};

/**
 * セッションの時刻の文字列を、ミリ秒の timestamp にする。
 * `Z` で終わる時刻と、秒の小数がある時刻も読める。
 *
 * @param value セッションの時刻の文字列
 * @returns ミリ秒の timestamp。読めない文字列は NaN
 */
export const parseSessionTime = (value: string): number => Date.parse(value);
