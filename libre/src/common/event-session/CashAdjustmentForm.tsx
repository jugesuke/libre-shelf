import { formatDenomination } from "@libre/common/format";
import { Input } from "@shelf/ui/components/input";
import { DENOMINATION_VALUES } from "./change-review";
import {
  DENOMINATION_KEYS,
  type CashAdjustmentFields,
  type DenominationFields,
} from "./cash-form";

type Props = {
  value: CashAdjustmentFields;
  onChange: (value: CashAdjustmentFields) => void;
};

function CountsColumn({
  title,
  value,
  onChange,
}: {
  title: string;
  value: DenominationFields;
  onChange: (value: DenominationFields) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="text-sm font-bold">{title}</div>
      {[...DENOMINATION_KEYS].reverse().map((key) => (
        <label key={key} className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground w-20 shrink-0 text-right tabular-nums whitespace-nowrap">
            {formatDenomination(DENOMINATION_VALUES[key])}
          </span>
          <Input
            type="number"
            min={0}
            step={1}
            className="min-w-0 text-right"
            placeholder="0"
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
          <span className="text-muted-foreground">枚</span>
        </label>
      ))}
    </div>
  );
}

/**
 * レジ金の出し入れの入力欄。「入れた」と「出した」の 2 列に、6 つの金種の枚数を入力する。メモの欄を含む。
 * 記録のボタンは呼び出し側が置く。
 *
 * @param value 入力欄の文字列
 * @param onChange 入力のたびに呼ぶ
 */
export function CashAdjustmentForm({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <CountsColumn
          title="入れた"
          value={value.cashIn}
          onChange={(cashIn) => onChange({ ...value, cashIn })}
        />
        <CountsColumn
          title="出した"
          value={value.cashOut}
          onChange={(cashOut) => onChange({ ...value, cashOut })}
        />
      </div>
      <Input
        type="text"
        aria-label="メモ"
        placeholder="メモ（任意）"
        value={value.comment}
        onChange={(e) => onChange({ ...value, comment: e.target.value })}
      />
    </div>
  );
}
