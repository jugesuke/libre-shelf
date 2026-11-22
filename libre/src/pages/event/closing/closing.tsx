import { formatYen } from "@libre/common/format";
import type {
  EventSessionV20261121,
  ItemDifference,
  ItemQuantity,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { DiscardSessionDialog } from "@libre/common/event-session/DiscardSessionDialog";
import { CashCountInput } from "@libre/common/event-session/CashCountInput";
import { reconciliationForClosing } from "@libre/common/event-session/cash-reconciliation-view";
import { cashDifference } from "@libre/common/event-session/cash-summary";
import { useClosingFormStore } from "@libre/common/event-session/closing-form-store";
import { menuProductName } from "@libre/common/event-session/menu-entry";
import { Alert } from "@shelf/ui/components/alert";
import { Button } from "@shelf/ui/components/button";
import { Input } from "@shelf/ui/components/input";
import { Page } from "@shelf/ui/components/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shelf/ui/components/table";
import { useEventAdapter } from "@libre/pages/event/event-adapter";
import { useTexts } from "@libre/app/texts";
import { useEffect, useState } from "react";

type Props = {
  session: EventSessionV20261121;
  onSessionUpdate: (session: EventSessionV20261121) => void;
  onDiscard: () => void;
  onBackToRegister: () => void;
};

// 商品ごとの販売合計数
function calcSalesQty(session: EventSessionV20261121): Map<string, number> {
  const map = new Map<string, number>();
  for (const tx of session.transactions) {
    if (tx.cancelled) continue;
    for (const item of tx.items) {
      map.set(item.itemId, (map.get(item.itemId) ?? 0) + item.quantity);
    }
  }
  return map;
}

// 理論在庫 = 持ち込み - 販売 - 見本誌提出 - 展示見本
function calcTheoreticalStock(
  session: EventSessionV20261121,
): Map<string, number> {
  const salesQty = calcSalesQty(session);
  const map = new Map<string, number>();
  for (const entry of session.menu) {
    const initial =
      session.openingStock.find((e) => e.itemId === entry.itemId)?.quantity ??
      0;
    const sales = salesQty.get(entry.itemId) ?? 0;
    const sample =
      session.sampleSubmissions.find((e) => e.itemId === entry.itemId)
        ?.quantity ?? 0;
    const display =
      session.displaySamples.find((e) => e.itemId === entry.itemId)?.quantity ??
      0;
    map.set(entry.itemId, initial - sales - sample - display);
  }
  return map;
}

export function ClosingPage({
  session,
  onSessionUpdate,
  onDiscard,
  onBackToRegister,
}: Props) {
  const { onClosingMatched } = useEventAdapter();
  const t = useTexts("closing");

  const theoreticalStock = calcTheoreticalStock(session);
  const salesQty = calcSalesQty(session);

  const {
    closingStockQty,
    closingCash,
    initializeFromSession,
    setClosingStockQty,
    setClosingCash,
    reset: resetForm,
  } = useClosingFormStore();

  useEffect(() => {
    initializeFromSession(session);
  }, [initializeFromSession, session]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [stockErrorIds, setStockErrorIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [cashError, setCashError] = useState<string>();
  // 破棄確認
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const getClosingStock = (): ItemQuantity[] =>
    session.menu
      .map((entry) => {
        const qty = Number(closingStockQty[entry.itemId] ?? "");
        if (Number.isNaN(qty)) return null;
        return { itemId: entry.itemId, quantity: qty };
      })
      .filter((e): e is ItemQuantity => e !== null);

  const getDifferences = (): ItemDifference[] => {
    const closing = getClosingStock();
    return closing
      .map((e) => {
        const theoretical = theoreticalStock.get(e.itemId) ?? 0;
        const diff = e.quantity - theoretical;
        return { itemId: e.itemId, difference: diff };
      })
      .filter((e) => e.difference !== 0);
  };

  const getCashDiff = (): number | null =>
    cashDifference({
      openingCash: session.openingCash,
      closingCash,
      cashAdjustments: session.cashAdjustments,
      transactions: session.transactions,
    });

  const allStockEntered = session.menu.every(
    (entry) =>
      closingStockQty[entry.itemId] !== undefined &&
      closingStockQty[entry.itemId] !== "",
  );

  const isStockEntered = (itemId: string) =>
    closingStockQty[itemId] !== undefined && closingStockQty[itemId] !== "";

  const handleComplete = async () => {
    setSubmitError(null);
    const missingStockIds = new Set(
      session.menu.map((e) => e.itemId).filter((id) => !isStockEntered(id)),
    );
    setStockErrorIds(missingStockIds);
    setCashError(
      closingCash === null ? "終了時レジ金を入力してください。" : undefined,
    );
    if (missingStockIds.size > 0 || closingCash === null) return;

    const closingStock = getClosingStock();
    const stockDifferences = getDifferences();
    const cashDiff = getCashDiff();
    const hasStockDiff = stockDifferences.length > 0;

    const closingOccurredAt = new Date().toISOString();

    // 差異なしの場合のみ、アプリが在庫の登録などを行う
    if (!hasStockDiff) {
      setSubmitting(true);
      setSubmitError(null);
      const result = await onClosingMatched({
        session,
        salesQty,
        occurredAt: closingOccurredAt,
      });
      if (!result.ok) {
        setSubmitError(result.message);
        setSubmitting(false);
        return;
      }

      onSessionUpdate({
        ...session,
        closingStock,
        closingCash,
        stockDifference: [],
        cashDifference: cashDiff,
        phase: "done",
      });
      resetForm();
      return;
    }

    // 差異あり → stock_movements は登録せず done へ
    onSessionUpdate({
      ...session,
      closingStock,
      closingCash,
      stockDifference: stockDifferences,
      cashDifference: cashDiff,
      phase: "done",
    });
    resetForm();
  };

  const stockDiffPreview = allStockEntered ? getDifferences() : null;
  const cashDiffPreview = getCashDiff();

  return (
    <Page
      title="当日終了処理"
      width="narrow"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onBackToRegister}>
            レジに戻る
          </Button>
          <Button variant="text" onClick={() => setShowDiscardConfirm(true)}>
            セッションを破棄する
          </Button>
        </div>
      }
    >
      <DiscardSessionDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        onDiscard={onDiscard}
      />

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">実在庫数</h2>
          <p className="text-muted-foreground text-sm">
            卓上に残っている冊数を入力してください。
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead numeric>理論在庫</TableHead>
                <TableHead numeric>実在庫</TableHead>
                <TableHead numeric>差異</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.menu.map((entry) => {
                const theoretical = theoreticalStock.get(entry.itemId) ?? 0;
                const actualStr = closingStockQty[entry.itemId];
                const actual =
                  actualStr !== undefined && actualStr !== ""
                    ? Number(actualStr)
                    : null;
                const diff = actual !== null ? actual - theoretical : null;
                const name =
                  entry.productName;
                const stockInvalid = stockErrorIds.has(entry.itemId);
                return (
                  <TableRow key={entry.itemId}>
                    <TableCell className="font-bold">{name}</TableCell>
                    <TableCell numeric>{theoretical}</TableCell>
                    <TableCell numeric>
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          min={0}
                          aria-label={`${name}の実在庫`}
                          className="w-24 text-right"
                          value={actualStr ?? ""}
                          placeholder="—"
                          aria-invalid={stockInvalid ? true : undefined}
                          aria-describedby={
                            stockInvalid
                              ? `closing-stock-error-${entry.itemId}`
                              : undefined
                          }
                          onChange={(e) => {
                            setStockErrorIds(
                              (prev) =>
                                new Set(
                                  [...prev].filter((id) => id !== entry.itemId),
                                ),
                            );
                            setClosingStockQty(entry.itemId, e.target.value);
                          }}
                        />
                        <span className="text-muted-foreground">冊</span>
                      </div>
                      {stockInvalid && (
                        <p
                          id={`closing-stock-error-${entry.itemId}`}
                          className="text-destructive-muted-foreground mt-1 text-xs"
                        >
                          実在庫数を入力してください。
                        </p>
                      )}
                    </TableCell>
                    <TableCell numeric>
                      {diff === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : diff === 0 ? (
                        <span className="text-success">±0</span>
                      ) : (
                        <span className="text-destructive font-bold">
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">終了時レジ金</h2>
          <p className="text-muted-foreground text-sm">
            会場で回収した現金を金種別に入力してください。
          </p>
          <CashCountInput
            value={closingCash}
            onChange={(value) => {
              setCashError(undefined);
              setClosingCash(value);
            }}
            reconciliation={reconciliationForClosing(session, closingCash)}
          />
          {cashError && (
            <p className="text-destructive-muted-foreground text-xs">
              {cashError}
            </p>
          )}
          {cashDiffPreview !== null && (
            <Alert variant={cashDiffPreview === 0 ? "success" : "warning"}>
              レジ金差異：
              {cashDiffPreview === 0
                ? "±0（一致）"
                : cashDiffPreview > 0
                  ? `+${formatYen(cashDiffPreview)}（過剰）`
                  : `-${formatYen(Math.abs(cashDiffPreview))}（不足）`}
            </Alert>
          )}
        </section>

        {stockDiffPreview !== null && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">差異確認</h2>
            {stockDiffPreview.length === 0 ? (
              <Alert variant="success">在庫差異はありません。</Alert>
            ) : (
              <Alert variant="warning">
                <p className="font-bold">在庫差異があります</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {stockDiffPreview.map((d) => (
                    <li key={d.itemId}>
                      {menuProductName(session.menu, d.itemId)}：
                      {d.difference > 0 ? `+${d.difference}` : d.difference} 部
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">
                  {t("stockDiffNote")}
                </p>
              </Alert>
            )}
          </section>
        )}

        <div className="flex min-h-14 items-center justify-end gap-3">
          {submitError && (
            <Alert variant="destructive" className="flex-1">
              {submitError}
            </Alert>
          )}
          <Button
            variant="primary"
            onClick={handleComplete}
            loading={submitting}
          >
            〆作業を完了する
          </Button>
        </div>
      </div>
    </Page>
  );
}
