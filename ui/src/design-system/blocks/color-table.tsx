import { useEffect, useState } from "react";
import { PALETTE, type PaletteKey } from "../../palette";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/table";

/** 色の文字列（hex、rgb、oklch など）を、ブラウザに描かせて RGB の 3 つの値にする */
function toRgb(color: string): readonly [number, number, number] | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** WCAG 2.2 の相対輝度 */
function luminance([r, g, b]: readonly [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** 2 つの色のコントラスト比。色を読めなかったときは null */
function contrast(a: string, b: string): number | null {
  const ra = toRgb(a);
  const rb = toRgb(b);
  if (!ra || !rb) return null;
  const [hi, lo] = [luminance(ra), luminance(rb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `:root` に定めた CSS の変数の値を読む。描いたあとに読むので、最初は空 */
function useCssVariables(names: readonly string[]): Record<string, string> {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setValues(Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()])));
  }, [names]);
  return values;
}


function Swatch({ color, label }: { color: string; label?: string }) {
  return (
    <span
      className="inline-flex h-8 w-16 items-center justify-center rounded-md border border-border-muted text-xs font-bold"
      style={{ background: color, color: label }}
    >
      {label ? "Aa" : null}
    </span>
  );
}

/** プライマリカラーの色の一覧の表。値は `ui/src/palette.ts` から読む */
export function PaletteTable() {
  const pages = (Object.keys(PALETTE) as PaletteKey[]).map((key) => ({
    name: PALETTE[key].name,
    theme: PALETTE[key],
  }));
  return (
    <div className="sb-unstyled my-4 font-sans">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>色</TableHead>
            <TableHead>色の上の文字</TableHead>
            <TableHead numeric>文字との比</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map(({ name, theme }) => {
            const ratio = contrast(theme.primary, theme.primaryForeground);
            return (
              <TableRow key={name}>
                <TableCell>{name}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <Swatch color={theme.primary} label={theme.primaryForeground} />
                    <code>{theme.primary}</code>
                  </span>
                </TableCell>
                <TableCell>
                  <code>{theme.primaryForeground}</code>
                </TableCell>
                <TableCell numeric>{ratio === null ? "—" : `${ratio.toFixed(2)} : 1`}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export type TokenRow = {
  /** 値を読む CSS の変数の名前（`--destructive` など） */
  name: string;
  /** 使う所 */
  usage: string;
};

/** 色の表。名前は CSS の変数の名前から `--` を除いたもの。値と白い背景との比は、`ui/src/theme.css` から読んで描く */
export function TokenTable({ rows }: { rows: readonly TokenRow[] }) {
  const values = useCssVariables(rows.map((r) => r.name));
  return (
    <div className="sb-unstyled my-4 font-sans">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>色</TableHead>
            <TableHead numeric>白との比</TableHead>
            <TableHead>使う所</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ name, usage }) => {
            const value = values[name] ?? "";
            const ratio = value ? contrast(value, "#ffffff") : null;
            return (
              <TableRow key={name}>
                <TableCell>
                  <code>{name.replace(/^--/, "")}</code>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <Swatch color={`var(${name})`} />
                    <code>{value}</code>
                  </span>
                </TableCell>
                <TableCell numeric>{ratio === null ? "—" : `${ratio.toFixed(2)} : 1`}</TableCell>
                <TableCell>{usage}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
