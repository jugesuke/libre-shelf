import { formatYen } from "@libre/common/format";
import {
  isConsignedItem,
  type EventSessionV20261121,
  type MenuEntry,
  type TransactionItem,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  formatConsignmentReport,
  type ConsignmentReportRow,
} from "./consignment-report";
import { Button } from "@shelf/ui/components/button";
import { Card } from "@shelf/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shelf/ui/components/table";
import { useToast } from "@shelf/ui/components/toast";
import { FloatingAlert } from "@shelf/ui/components/floating-alert";
import { useRef, useState, type ReactNode } from "react";

/** 旧スキーマのおしながきにはない商品名と発行者名を除いた、おしながきの 1 エントリ */
type ConsignmentMenuEntry = Pick<MenuEntry, "itemId" | "price" | "consignorName">;

/**
 * 集計に使う、スキーマのバージョンによらない項目。
 * 結果画面の旧スキーマ（2026-07-10）のセッションも受け取れるように、現行のセッションの一部だけを要求する。
 */
type ConsignmentSessionView = Pick<
  EventSessionV20261121,
  | "openingStock"
  | "sampleSubmissions"
  | "displaySamples"
  | "closingStock"
  | "eventDate"
> & {
  menu: ConsignmentMenuEntry[];
  transactions: {
    cancelled: boolean;
    items: Pick<TransactionItem, "itemId" | "price" | "quantity">[];
  }[];
};

/** 商品ごとの販売数量（取消済みを除く）を集計する。 */
function calcSalesQty(session: ConsignmentSessionView): Map<string, number> {
  const map = new Map<string, number>();
  for (const tx of session.transactions) {
    if (tx.cancelled) continue;
    for (const item of tx.items) {
      map.set(item.itemId, (map.get(item.itemId) ?? 0) + item.quantity);
    }
  }
  return map;
}

/** 商品ごとの売上金額（取消済みを除く。金額は販売時価格で計算）を集計する。 */
function calcSalesRevenue(
  session: ConsignmentSessionView,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const tx of session.transactions) {
    if (tx.cancelled) continue;
    for (const item of tx.items) {
      map.set(
        item.itemId,
        (map.get(item.itemId) ?? 0) + item.price * item.quantity,
      );
    }
  }
  return map;
}

type Props = {
  session: ConsignmentSessionView;
  /** 商品名の解決関数。商品キャッシュの取得方法が呼び出し元ごとに異なるため引数で受け取る */
  itemName: (itemId: string) => string;
  /**
   * 外枠・見出しの体裁。
   * - "plain"（既定）: 従来どおりの体裁（見出しのみ、外枠なし）。done の委託タブで使用
   * - "card": 白背景カード（result ページの他セクションと同じ体裁）。結果画面で使用
   */
  variant?: "plain" | "card";
};

type ConsignorCardProps = {
  name: string;
  total: number;
  /** コピーに失敗したときの文言。失敗していないときは `undefined` */
  copyFailure: string | undefined;
  onCopy: () => void;
  onCopyFailureClose: () => void;
  children: ReactNode;
};

/** 委託元ごとのカード。コピーに失敗したときは、ヘッダーの下に浮かせてアラートを出す */
function ConsignorCard({
  name,
  total,
  copyFailure,
  onCopy,
  onCopyFailureClose,
  children,
}: ConsignorCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // アラートの幅と位置をそろえる行はカードのヘッダー全体。Card はヘッダーの ref を受け取らないので、描かれたあとに探す
  const headerRef = {
    get current() {
      return cardRef.current?.querySelector<HTMLElement>(
        '[data-slot="card-header"]',
      ) ?? null;
    },
  };
  return (
    <Card
      ref={cardRef}
      title={name}
      actions={
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tabular-nums">
            {formatYen(total)}
          </span>
          <Button ref={buttonRef} variant="secondary" onClick={onCopy}>
            コピー
          </Button>
        </div>
      }
    >
      {children}
      <FloatingAlert
        anchor={headerRef}
        target={buttonRef}
        message={copyFailure ?? ""}
        open={copyFailure !== undefined}
        onClose={onCopyFailureClose}
      />
    </Card>
  );
}

/**
 * 委託販売サマリー（委託元ごとのカード: 商品別の入荷・販売・見本誌提出・展示見本・残部・売上テーブル + 売上合計 + markdown コピー）を描画する。
 * イベント終了画面（done の委託タブ）と過去イベント結果画面（result）の両方から使う共通コンポーネント。
 * 委託物がないセッションでは何も表示しない（null を返す）。
 */
export function ConsignmentSummary({
  session,
  itemName,
  variant = "plain",
}: Props) {
  const { showToast } = useToast();
  // コピーに失敗した委託元の名前 → メッセージ
  const [copyFailures, setCopyFailures] = useState<Record<string, string>>({});
  // 保存済みの委託元データ（menu の consignorName）を使って集計
  const consignedEntries = session.menu.filter(isConsignedItem);
  if (consignedEntries.length === 0) return null;

  const salesQty = calcSalesQty(session);
  const salesRevenue = calcSalesRevenue(session);
  const initialMap = new Map(
    session.openingStock.map((e) => [e.itemId, e.quantity]),
  );
  const sampleMap = new Map(
    session.sampleSubmissions.map((e) => [e.itemId, e.quantity]),
  );
  const displayMap = new Map(
    session.displaySamples.map((e) => [e.itemId, e.quantity]),
  );
  const closingMap = new Map(
    (session.closingStock ?? []).map((e) => [e.itemId, e.quantity]),
  );

  // 委託元ごとにグループ化
  const byConsignor = new Map<string, ConsignmentMenuEntry[]>();
  for (const entry of consignedEntries) {
    const name = entry.consignorName;
    if (!byConsignor.has(name)) byConsignor.set(name, []);
    byConsignor.get(name)!.push(entry);
  }

  const consignorCards = (
    <div className="flex flex-col gap-4">
      {Array.from(byConsignor.entries()).map(([name, entries]) => {
        // テーブル表示とコピー用テキストで同じ集計値を共有する
        const rows: (ConsignmentReportRow & { itemId: string })[] =
          entries.map((entry) => ({
            itemId: entry.itemId,
            itemName: itemName(entry.itemId),
            initial: initialMap.get(entry.itemId) ?? 0,
            sold: salesQty.get(entry.itemId) ?? 0,
            sample: sampleMap.get(entry.itemId) ?? 0,
            display: displayMap.get(entry.itemId) ?? 0,
            closing: closingMap.get(entry.itemId),
            revenue: salesRevenue.get(entry.itemId) ?? 0,
          }));
        const total = rows.reduce((sum, r) => sum + r.revenue, 0);
        const handleCopy = async () => {
          setCopyFailures(({ [name]: _, ...rest }) => rest);
          try {
            await navigator.clipboard.writeText(
              formatConsignmentReport(session.eventDate, name, rows),
            );
            showToast("コピーしました。");
          } catch {
            setCopyFailures((prev) => ({
              ...prev,
              [name]: "コピーできませんでした。もう一度コピーしてください。",
            }));
          }
        };
        return (
          <ConsignorCard
            key={name}
            name={name}
            total={total}
            copyFailure={copyFailures[name]}
            onCopy={handleCopy}
            onCopyFailureClose={() =>
              setCopyFailures(({ [name]: _, ...rest }) => rest)
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品名</TableHead>
                  <TableHead numeric>入荷</TableHead>
                  <TableHead numeric>販売</TableHead>
                  <TableHead numeric>見本誌提出</TableHead>
                  <TableHead numeric>展示見本</TableHead>
                  <TableHead numeric>残部</TableHead>
                  <TableHead numeric>売上金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.itemId}>
                    <TableCell>{row.itemName}</TableCell>
                    <TableCell numeric>{row.initial}</TableCell>
                    <TableCell numeric>{row.sold}</TableCell>
                    <TableCell numeric>{row.sample}</TableCell>
                    <TableCell numeric>{row.display}</TableCell>
                    <TableCell numeric>{row.closing ?? "—"}</TableCell>
                    <TableCell numeric className="font-bold">
                      {formatYen(row.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ConsignorCard>
        );
      })}
    </div>
  );

  if (variant === "card") {
    return <Card title="委託販売サマリー">{consignorCards}</Card>;
  }

  return (
    <section className="flex flex-col gap-4 pb-8">
      <h2 className="text-lg font-bold">委託販売サマリー</h2>
      {consignorCards}
    </section>
  );
}
