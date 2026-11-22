/** 整数の数字列を 3 桁ごとにカンマで区切る。符号は保つ。 */
const groupThousands = (digits: string): string =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** 地方時の日付を "2026/01/05" にする。 */
const localDate = (date: Date): string =>
  `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;

/** 地方時の時刻を "09:00" にする。 */
const localTime = (date: Date): string =>
  `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

/** 数字列の前に「¥」を付ける。負の数は「-」を「¥」の前に置く。 */
const withYenMark = (digits: string): string =>
  digits.startsWith("-") ? `-¥${digits.slice(1)}` : `¥${digits}`;

/** 整数の金額を "¥1,000" の形にする。 */
export function formatYen(amount: number): string {
  return withYenMark(groupThousands(String(amount)));
}

/** 小数が出うる金額を、小数 1 桁の "¥245.9" の形にする。 */
export function formatYenOneDecimal(amount: number): string {
  const [integer, fraction] = amount.toFixed(1).split(".");
  return `${withYenMark(groupThousands(integer ?? ""))}.${fraction ?? ""}`;
}

/**
 * 硬貨と紙幣の名前を "100円玉"、"1,000円札" の形にする。
 * 500 以下を硬貨、1000 以上を紙幣とする。501〜999 は仕様になく、紙幣として扱う。
 */
export function formatDenomination(value: number): string {
  const label = groupThousands(String(value));
  return value <= 500 ? `${label}円玉` : `${label}円札`;
}

/** ISO 8601 の日時を、地方時で "2026/01/05 09:00" にする。 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${localDate(date)} ${localTime(date)}`;
}

/**
 * ISO 8601 の日時か "YYYY-MM-DD" を "2026/01/05" にする。
 * "YYYY-MM-DD" は Date を通すと UTC 扱いで日付がずれるため、文字列のまま変える。
 */
export function formatDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.replace(/-/g, "/");
  }
  return localDate(new Date(value));
}

/** ISO 8601 の日時を、地方時で "09:00" にする。 */
export function formatTime(iso: string): string {
  return localTime(new Date(iso));
}
