/**
 * サービスアイコン（積み上がった本）の SVG を生成する純粋ロジック。
 *
 * セクション（＝本）の配列を受け取り、決定的に SVG 文字列を返す。乱数は使わず、
 * 左右のばらつきは各 key のハッシュから決めるため、毎回同じ結果になり、
 * セクションが増減しても既存の本の水平配置は変わらない。
 *
 * 外形は固定の正方形 viewBox。冊数が増えると本の厚みが薄くなるだけで、
 * アイコン全体のサイズは一定に保たれる。
 */

/** アイコン1冊ぶんの入力。color は SVG が解釈できる任意の色文字列 */
export type IconSection = { key: string; color: string };

/** viewBox の一辺（正方形） */
export const SIZE = 128;

// 積みの内容領域（この範囲に全冊を詰める。外形はこれで一定になる）
const PAD_Y = 14;
const CONTENT_TOP = PAD_Y;
const CONTENT_H = SIZE - PAD_Y * 2;

// 本の水平方向のレイアウト
const PAD_X = 12;
const CONTENT_W = SIZE - PAD_X * 2;
const STAGGER = 8; // 左右ずれの最大量
const WIDTH_JITTER = 6; // 幅の揺らぎ最大量
const MAX_BOOK_W = CONTENT_W - STAGGER;

// 本の内部プロポーション（厚み t・幅 w に対する比率で保持する）
const SPINE_RATIO = 0.11; // 背表紙（左）の幅 / w
const CAP_RATIO = 0.22; // 表紙の上下の縁の厚み / t
const CORNER_RATIO = 0.17; // 角丸 / t
const STRIA_GAP_RATIO = 0.13; // 小口のスジ間隔の目安 / t
const STRIA_WIDTH_RATIO = 0.045; // スジの線幅 / t

const PAGE_COLOR = "#FCFBF9"; // 小口（紙）の白
const STRIA_COLOR = "#B0ABA1"; // 紙のスジのグレー

/** 文字列を 0 以上 1 未満の値へ決定的に写像する（FNV-1a ベース） */
export function hash01(input: string): number {
  const h = Array.from(input).reduce(
    (acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
  return (h >>> 0) / 2 ** 32;
}

/** 小数を丸めて SVG 出力用に整える */
function r(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 冊数から縦方向のレイアウト（各本の上端 y と厚み）を求める。外形は冊数によらず一定 */
export function stackLayout(count: number): { y: number; thickness: number }[] {
  if (count <= 0) {
    throw new Error("stackLayout: count must be positive and non-zero");
  }

  const thickness = CONTENT_H / count;
  return Array.from({ length: count }, (_, i) => ({
    y: CONTENT_TOP + i * thickness,
    thickness,
  }));
}

/** 1冊ぶんの水平配置（x・幅）。key のみで決まり、リストの内容や冊数に依存しない */
function bookHorizontal(key: string): { x: number; w: number } {
  const w = MAX_BOOK_W - hash01(`w:${key}`) * WIDTH_JITTER;
  const x = PAD_X + hash01(`x:${key}`) * STAGGER;
  return { x, w };
}

/** 小口の紙のスジ（グレーの横線）を生成する。線は小口側（右端）まで届かせる */
function striations(
  x: number,
  pageX: number,
  pageY: number,
  w: number,
  pageH: number,
  t: number,
): string {
  const lineCount = Math.max(2, Math.round(pageH / (t * STRIA_GAP_RATIO)));
  const gap = pageH / (lineCount + 1);
  const x1 = pageX + w * 0.02;
  const x2 = x + w;
  const lines = Array.from({ length: lineCount }, (_, k) => {
    const ly = pageY + gap * (k + 1);
    return `<line x1="${r(x1)}" y1="${r(ly)}" x2="${r(x2)}" y2="${r(ly)}"/>`;
  }).join("");
  return `<g stroke="${STRIA_COLOR}" stroke-width="${r(t * STRIA_WIDTH_RATIO)}" stroke-linecap="butt">${lines}</g>`;
}

/** 1冊ぶんの SVG。表紙はコの字（左＝背表紙・上・下）、右の小口は開放 */
function book(section: IconSection, y: number, t: number): string {
  const { x, w } = bookHorizontal(section.key);
  const spine = w * SPINE_RATIO;
  const cap = t * CAP_RATIO;
  const corner = t * CORNER_RATIO;
  const pageX = x + spine;
  const pageY = y + cap;
  const pageW = w - spine; // 右端（x+w）まで＝小口を開放
  const pageH = t - cap * 2;
  return (
    `<g data-key="${section.key}" data-geom="${r(x)},${r(w)}">` +
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(t)}" rx="${r(corner)}" ry="${r(corner)}" fill="${section.color}"/>` +
    `<rect x="${r(pageX)}" y="${r(pageY)}" width="${r(pageW)}" height="${r(pageH)}" fill="${PAGE_COLOR}"/>` +
    striations(x, pageX, pageY, w, pageH, t) +
    `</g>`
  );
}

/** セクション配列から本アイコンの SVG 文字列を生成する */
export function buildBookIconSvg(sections: IconSection[]): string {
  const rows = stackLayout(sections.length);
  const books = sections
    .map((s, i) => book(s, rows[i].y, rows[i].thickness))
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">` +
    books +
    `</svg>`
  );
}
