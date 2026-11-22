import { formatDenomination, formatYen } from "@libre/common/format";
import { useEffect, useRef, useState } from "react";
import { Input } from "@shelf/ui/components/input";
import type { CashCount } from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  cashCountFromFields,
  countsFromFields,
  fieldsFromCashCount,
  parseCount,
  type CashCountFields,
} from "./cash-form";
import {
  DENOMINATION_VALUES,
  denominationCountsAmount,
  type ChangeReconciliation,
  type DenominationKey,
} from "./change-review";
import {
  reconciliationCells,
  type ReconciliationCells,
} from "./cash-reconciliation-view";

type Props = {
  value: CashCount | null;
  onChange: (value: CashCount | null) => void;
  /**
   * 金種ごとの、記録から求めた枚数と差。渡すと各行の右に列を足す（当日終了処理で使う）。
   * 渡さないときは、開始処理などと同じ表示になる。
   */
  reconciliation?: Record<DenominationKey, ChangeReconciliation | null>;
};

const COIN_DENOMINATIONS: { key: DenominationKey; label: string }[] = [
  { key: "500yen", label: formatDenomination(500) },
  { key: "100yen", label: formatDenomination(100) },
];

const BILL_DENOMINATIONS: { key: DenominationKey; label: string }[] = [
  { key: "10000yen", label: formatDenomination(10000) },
  { key: "5000yen", label: formatDenomination(5000) },
  { key: "2000yen", label: formatDenomination(2000) },
  { key: "1000yen", label: formatDenomination(1000) },
];

function DenominationRow({
  label,
  value,
  unit,
  onChange,
  cells,
}: {
  label: string;
  value: string;
  unit: number;
  onChange: (v: string) => void;
  cells: ReconciliationCells | null;
}) {
  const count = parseCount(value);
  const subtotal = count * unit;
  return (
    <tr className={cells?.mismatch ? "bg-warning-muted" : undefined}>
      <td className="w-px whitespace-nowrap py-1 pl-2 pr-2 text-right">{label}</td>
      <td className="w-4 px-1 py-1 text-muted-foreground">×</td>
      <td className="w-28 py-1 pr-1">
        <Input
          type="number"
          min={0}
          aria-label={`${label}の枚数`}
          className="text-right"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
        />
      </td>
      <td className="w-4 whitespace-nowrap pl-1 py-1 text-muted-foreground">枚 =</td>
      <td className="w-20 whitespace-nowrap py-1 pl-2 text-right tabular-nums">
        {count > 0 ? formatYen(subtotal) : ""}
      </td>
      {cells && (
        <>
          <td className="whitespace-nowrap py-1 pl-3 text-right tabular-nums">
            {cells.recorded}
          </td>
          <td
            className={`whitespace-nowrap py-1 pl-2 pr-2 text-right tabular-nums ${cells.mismatch ? "font-bold text-warning" : ""}`}
          >
            {cells.difference}
          </td>
        </>
      )}
    </tr>
  );
}

function GroupHeader({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="text-muted-foreground pt-3 pb-1 pl-2 text-xs font-bold"
      >
        {label}
      </td>
    </tr>
  );
}

/**
 * レジ金を金種ごとの枚数で入力する欄。硬貨、紙幣、その他（1、5、10、50 円の合計の金額）の順に並べ、小計と合計を表示する。
 *
 * @param value 保存した値。最初に値があれば、各欄に表示する
 * @param onChange 入力のたびに呼ぶ。合計が 0 円なら null を渡す
 * @param reconciliation 渡すと、各金種の行に記録の枚数と差を出す
 */
export function CashCountInput({ value, onChange, reconciliation }: Props) {
  const initializedRef = useRef(false);
  const [fields, setFields] = useState<CashCountFields>(() =>
    fieldsFromCashCount(null),
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (value !== null) setFields(fieldsFromCashCount(value));
  }, [value]);

  const update = (next: CashCountFields) => {
    setFields(next);
    onChange(cashCountFromFields(next));
  };

  const other = parseCount(fields.other);
  const total = denominationCountsAmount(countsFromFields(fields.counts)) + other;

  // 突き合わせの列は、金種の行の右に 2 列足す
  const extraColumns = reconciliation ? 2 : 0;
  const columnCount = 5 + extraColumns;

  const renderRows = (denominations: { key: DenominationKey; label: string }[]) =>
    denominations.map(({ key, label }) => (
      <DenominationRow
        key={key}
        label={label}
        value={fields.counts[key]}
        unit={DENOMINATION_VALUES[key]}
        onChange={(v) =>
          update({ ...fields, counts: { ...fields.counts, [key]: v } })
        }
        cells={reconciliation ? reconciliationCells(reconciliation[key]) : null}
      />
    ));

  return (
    <div className={reconciliation ? "w-full max-w-md" : "w-full max-w-xs"}>
      <table className="w-full text-sm text-foreground">
        <tbody>
          {reconciliation && (
            <tr className="text-muted-foreground text-xs">
              <td colSpan={5} />
              <td className="whitespace-nowrap py-1 pl-3 text-right">記録</td>
              <td className="whitespace-nowrap py-1 pl-2 pr-2 text-right">差</td>
            </tr>
          )}
          <GroupHeader label="硬貨" colSpan={columnCount} />
          {renderRows(COIN_DENOMINATIONS)}
          <GroupHeader label="紙幣" colSpan={columnCount} />
          {renderRows(BILL_DENOMINATIONS)}
          <GroupHeader label="その他" colSpan={columnCount} />
          <tr>
            <td className="py-1 pr-1 pl-8" colSpan={3}>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">¥</span>
                <Input
                  type="number"
                  min={0}
                  aria-label="その他の金額"
                  className="text-right"
                  value={fields.other}
                  onChange={(e) => update({ ...fields, other: e.target.value })}
                  placeholder="0"
                />
              </div>
            </td>
            <td />
            <td className="w-20 whitespace-nowrap py-1 pl-2 text-right tabular-nums">
              {other > 0 ? formatYen(other) : ""}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border-t border-border">
            <td colSpan={3} />
            <td className="whitespace-nowrap pt-2 pl-1 font-bold">合計</td>
            <td className="w-20 whitespace-nowrap pt-2 pl-2 text-right font-bold tabular-nums">
              {formatYen(total)}
            </td>
            {extraColumns > 0 && <td colSpan={extraColumns} />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
