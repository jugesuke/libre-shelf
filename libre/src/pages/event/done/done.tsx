import { formatTime, formatYen } from "@libre/common/format";
import { X } from "lucide-react";
import type {
  CashAdjustment,
  EventSessionV20261121,
  ItemQuantity,
  ItemQuantityWithTime,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { isConsignedItem } from "@libre-shared/entity/event/v2026-11-21/event-session";
import { CashAdjustmentForm } from "@libre/common/event-session/CashAdjustmentForm";
import { DiscardSessionDialog } from "@libre/common/event-session/DiscardSessionDialog";
import { CashCountInput } from "@libre/common/event-session/CashCountInput";
import {
  cashAdjustmentFromFields,
  emptyCashAdjustmentFields,
  fieldsFromCashAdjustment,
  formatDenominationCounts,
} from "@libre/common/event-session/cash-form";
import {
  cashAdjustmentsTotal,
  cashDifference,
  salesTotal as calcSalesTotal,
} from "@libre/common/event-session/cash-summary";
import { cashAdjustmentAmount } from "@libre/common/event-session/change-review";
import { useDoneFormStore } from "@libre/common/event-session/done-form-store";
import { buildConsignorsSaveResult } from "./consignor-save";
import { ConsignmentSummary } from "@libre/common/event-session/ConsignmentSummary";
import { menuProductName } from "@libre/common/event-session/menu-entry";
import { formatSessionTime } from "@libre/common/event-session/session-time";
import { Alert } from "@shelf/ui/components/alert";
import { Button } from "@shelf/ui/components/button";
import { Card } from "@shelf/ui/components/card";
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
import { Tabs } from "@shelf/ui/components/tabs";
import { useToast } from "@shelf/ui/components/toast";
import { useEventAdapter } from "@libre/pages/event/event-adapter";
import { useTexts } from "@libre/app/texts";
import { useEffect, useState } from "react";

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

type Props = {
  session: EventSessionV20261121;
  onSessionUpdate: (session: EventSessionV20261121) => void;
  onDiscard: () => void;
  onComplete: () => void;
};

export function DonePage({
  session,
  onSessionUpdate,
  onDiscard,
  onComplete,
}: Props) {
  const { DoneStockSection, DoneFinish } = useEventAdapter();
  const t = useTexts("done");
  const { showToast } = useToast();

  // 破棄確認
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // レジ金増減（セッション由来のローカル状態）
  const [cashAdjustments, setCashAdjustments] = useState<CashAdjustment[]>(
    session.cashAdjustments,
  );
  const [cashAdjFields, setCashAdjFields] = useState(emptyCashAdjustmentFields);
  // 直している行の位置。null なら新しい出し入れを追加する
  const [editingCashAdjIndex, setEditingCashAdjIndex] = useState<number | null>(
    null,
  );

  const {
    openingCash,
    closingCash,
    openingStockQty,
    sampleQty,
    displayQty,
    closingStockQty,
    consignors,
    initializeFromSession,
    setOpeningCash,
    setClosingCash,
    setOpeningStockQty,
    setSampleQty,
    setDisplayQty,
    setClosingStockQty,
    setConsignor,
  } = useDoneFormStore();

  useEffect(() => {
    initializeFromSession(session);
  }, [initializeFromSession, session]);

  const salesQty = calcSalesQty(session);

  // 持ち込み・見本誌・展示見本の編集値から理論在庫を再計算
  const theoreticalStock = new Map<string, number>();
  for (const entry of session.menu) {
    const initial = parseInt(openingStockQty[entry.itemId] ?? "0", 10) || 0;
    const sales = salesQty.get(entry.itemId) ?? 0;
    const sample = parseInt(sampleQty[entry.itemId] ?? "0", 10) || 0;
    const display = parseInt(displayQty[entry.itemId] ?? "0", 10) || 0;
    theoreticalStock.set(entry.itemId, initial - sales - sample - display);
  }

  // 現在の差異（編集値ベース）
  const currentDiff = session.menu
    .map((entry) => {
      const theoretical = theoreticalStock.get(entry.itemId) ?? 0;
      const actual = parseInt(closingStockQty[entry.itemId] ?? "", 10);
      if (isNaN(actual)) return null;
      const diff = actual - theoretical;
      return diff !== 0 ? { itemId: entry.itemId, difference: diff } : null;
    })
    .filter((e): e is { itemId: string; difference: number } => e !== null);

  // レジ金差異（編集値ベース）
  const cashDiff = cashDifference({
    openingCash,
    closingCash,
    cashAdjustments,
    transactions: session.transactions,
  });

  const salesTotal = calcSalesTotal(session.transactions);

  const movementsApplied =
    session.stockDifference !== null && session.stockDifference.length === 0;

  const itemName = (itemId: string) => menuProductName(session.menu, itemId);

  const buildUpdatedSession = (): EventSessionV20261121 => {
    const now = formatSessionTime(new Date());

    const newSampleSubmissions: ItemQuantityWithTime[] = session.menu
      .map((entry) => {
        const qty = parseInt(sampleQty[entry.itemId] ?? "0", 10) || 0;
        if (qty <= 0) return null;
        const existing = session.sampleSubmissions.find(
          (e) => e.itemId === entry.itemId,
        );
        return {
          itemId: entry.itemId,
          quantity: qty,
          occurredAt: existing?.occurredAt ?? now,
        };
      })
      .filter((e): e is ItemQuantityWithTime => e !== null);

    const newDisplaySamples: ItemQuantityWithTime[] = session.menu
      .map((entry) => {
        const qty = parseInt(displayQty[entry.itemId] ?? "0", 10) || 0;
        if (qty <= 0) return null;
        const existing = session.displaySamples.find(
          (e) => e.itemId === entry.itemId,
        );
        return {
          itemId: entry.itemId,
          quantity: qty,
          occurredAt: existing?.occurredAt ?? now,
        };
      })
      .filter((e): e is ItemQuantityWithTime => e !== null);

    const newOpeningStock: ItemQuantity[] = session.menu
      .map((entry) => {
        const qty = parseInt(openingStockQty[entry.itemId] ?? "0", 10) || 0;
        if (qty <= 0) return null;
        return { itemId: entry.itemId, quantity: qty };
      })
      .filter((e): e is ItemQuantity => e !== null);

    const newClosingStock: ItemQuantity[] = session.menu
      .map((entry) => {
        const qty = parseInt(closingStockQty[entry.itemId] ?? "", 10);
        if (isNaN(qty)) return null;
        return { itemId: entry.itemId, quantity: qty };
      })
      .filter((e): e is ItemQuantity => e !== null);

    const { menu: newMenu, consignedStock: newConsignedStock } =
      buildConsignorsSaveResult(session, consignors);

    return {
      ...session,
      openingCash,
      closingCash,
      openingStock: newOpeningStock,
      sampleSubmissions: newSampleSubmissions,
      displaySamples: newDisplaySamples,
      closingStock: newClosingStock,
      cashAdjustments,
      menu: newMenu,
      consignedStock: newConsignedStock,
    };
  };

  // セクション別 dirty 判定
  const stockDirty = (() => {
    for (const entry of session.menu) {
      const id = entry.itemId;
      const formClosing = closingStockQty[id];
      const sessionClosing = session.closingStock?.find(
        (e) => e.itemId === id,
      )?.quantity;
      const formClosingNum =
        formClosing !== undefined && formClosing !== ""
          ? parseInt(formClosing, 10)
          : null;
      if (formClosingNum !== (sessionClosing ?? null)) return true;
      const formInitial = parseInt(openingStockQty[id] ?? "0", 10) || 0;
      if (
        formInitial !==
        (session.openingStock.find((e) => e.itemId === id)?.quantity ?? 0)
      )
        return true;
      const formSample = parseInt(sampleQty[id] ?? "0", 10) || 0;
      if (
        formSample !==
        (session.sampleSubmissions.find((e) => e.itemId === id)?.quantity ?? 0)
      )
        return true;
      const formDisplay = parseInt(displayQty[id] ?? "0", 10) || 0;
      if (
        formDisplay !==
        (session.displaySamples.find((e) => e.itemId === id)?.quantity ?? 0)
      )
        return true;
    }
    return false;
  })();

  const cashDirty2 =
    JSON.stringify(openingCash) !== JSON.stringify(session.openingCash) ||
    JSON.stringify(closingCash) !== JSON.stringify(session.closingCash) ||
    JSON.stringify(cashAdjustments) !== JSON.stringify(session.cashAdjustments);

  const consignorsDirty = (() => {
    const formEntries = Object.entries(consignors).filter(
      ([, v]) => v.trim() !== "",
    );
    const sessionEntries = session.menu.filter(isConsignedItem);
    if (formEntries.length !== sessionEntries.length) return true;
    for (const [itemId, name] of formEntries) {
      // セッション側は trim 済みの値が保存されるため、フォーム側も trim して比較する
      if (
        session.menu.find((e) => e.itemId === itemId)?.consignorName !==
        name.trim()
      )
        return true;
    }
    return false;
  })();

  const hasUnsavedInput = stockDirty || cashDirty2 || consignorsDirty;

  const handleSaveStock = () => {
    const updated = buildUpdatedSession();
    onSessionUpdate({
      ...session,
      closingStock: updated.closingStock,
      openingStock: updated.openingStock,
      sampleSubmissions: updated.sampleSubmissions,
      displaySamples: updated.displaySamples,
    });
    showToast("保存しました。");
  };

  const handleSaveCash = () => {
    const updated = buildUpdatedSession();
    onSessionUpdate({
      ...session,
      openingCash: updated.openingCash,
      closingCash: updated.closingCash,
      cashAdjustments: updated.cashAdjustments,
    });
    showToast("保存しました。");
  };

  const handleSaveConsignors = () => {
    const { menu, consignedStock } = buildConsignorsSaveResult(
      session,
      consignors,
    );
    onSessionUpdate({ ...session, menu, consignedStock });
    showToast("保存しました。");
  };

  const newCashAdj = cashAdjustmentFromFields(
    cashAdjFields,
    editingCashAdjIndex !== null
      ? cashAdjustments[editingCashAdjIndex].occurredAt
      : formatSessionTime(new Date()),
  );

  const handleSubmitCashAdj = () => {
    if (newCashAdj === null) return;
    setCashAdjustments((prev) =>
      editingCashAdjIndex === null
        ? [...prev, newCashAdj]
        : prev.map((a, i) => (i === editingCashAdjIndex ? newCashAdj : a)),
    );
    setCashAdjFields(emptyCashAdjustmentFields());
    setEditingCashAdjIndex(null);
  };

  const handleEditCashAdj = (index: number) => {
    setCashAdjFields(fieldsFromCashAdjustment(cashAdjustments[index]));
    setEditingCashAdjIndex(index);
  };

  const handleDeleteCashAdj = (index: number) => {
    setCashAdjustments((prev) => prev.filter((_, i) => i !== index));
    setCashAdjFields(emptyCashAdjustmentFields());
    setEditingCashAdjIndex(null);
  };

  type DoneTab = "stock" | "cash" | "consignment";
  const [activeTab, setActiveTab] = useState<DoneTab>("stock");

  const tabs: { value: DoneTab; label: string }[] = [
    { value: "stock", label: t("stockTab") },
    { value: "cash", label: "レジ金" },
    { value: "consignment", label: "委託" },
  ];

  const lockedNote = movementsApplied ? (
    <span className="text-muted-foreground text-xs">{t("lockedNote")}</span>
  ) : null;

  const diffCell = (diff: number | null) =>
    diff === null ? (
      <span className="text-muted-foreground">—</span>
    ) : diff === 0 ? (
      <span className="text-success">±0</span>
    ) : (
      <span className="text-destructive font-bold">
        {diff > 0 ? `+${diff}` : diff}
      </span>
    );

  return (
    <Page
      title="イベント終了"
      width="narrow"
      actions={
        <Button variant="text" onClick={() => setShowDiscardConfirm(true)}>
          セッションを破棄する
        </Button>
      }
    >
      <DiscardSessionDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        onDiscard={onDiscard}
      />

      <div className="flex flex-col gap-4">
        <Tabs options={tabs} value={activeTab} onChange={setActiveTab} />

        <DoneFinish
          session={session}
          stockConfirmed={movementsApplied}
          hasUnsavedInput={hasUnsavedInput}
          onSessionUpdate={onSessionUpdate}
          onComplete={onComplete}
        />

        {activeTab === "stock" && (
          <div className="flex flex-col gap-8">
            <DoneStockSection
              session={session}
              currentDiff={currentDiff}
              buildUpdatedSession={buildUpdatedSession}
              salesQty={salesQty}
              onSessionUpdate={onSessionUpdate}
            />

            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">実在庫数</h2>
                {lockedNote}
              </div>
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
                        ? parseInt(actualStr, 10)
                        : null;
                    const diff = actual !== null ? actual - theoretical : null;
                    const name = itemName(entry.itemId);
                    return (
                      <TableRow key={entry.itemId}>
                        <TableCell className="font-bold">{name}</TableCell>
                        <TableCell numeric>{theoretical}</TableCell>
                        <TableCell numeric>
                          {movementsApplied ? (
                            (actual ?? "—")
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                min={0}
                                aria-label={`${name}の実在庫`}
                                className="w-24 text-right"
                                value={actualStr ?? ""}
                                placeholder="—"
                                onChange={(e) =>
                                  setClosingStockQty(entry.itemId, e.target.value)
                                }
                              />
                              <span className="text-muted-foreground">冊</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell numeric>{diffCell(diff)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">持ち込み在庫数</h2>
                {lockedNote}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead numeric>持ち込み在庫数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {session.menu.map((entry) => {
                    const name = itemName(entry.itemId);
                    return (
                      <TableRow key={entry.itemId}>
                        <TableCell className="font-bold">{name}</TableCell>
                        <TableCell numeric>
                          {movementsApplied ? (
                            openingStockQty[entry.itemId] || "—"
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                min={0}
                                aria-label={`${name}の持ち込み在庫数`}
                                className="w-24 text-right"
                                value={openingStockQty[entry.itemId] ?? ""}
                                onChange={(e) =>
                                  setOpeningStockQty(entry.itemId, e.target.value)
                                }
                              />
                              <span className="text-muted-foreground">冊</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">見本誌・展示見本</h2>
                {lockedNote}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-normal">商品名</TableHead>
                    <TableHead numeric className="whitespace-normal">
                      見本誌提出数
                    </TableHead>
                    <TableHead numeric className="whitespace-normal">
                      展示見本数
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {session.menu.map((entry) => {
                    const name = itemName(entry.itemId);
                    return (
                      <TableRow key={entry.itemId}>
                        <TableCell className="font-bold whitespace-normal">
                          {name}
                        </TableCell>
                        <TableCell numeric>
                          {movementsApplied ? (
                            sampleQty[entry.itemId] || "0"
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                min={0}
                                aria-label={`${name}の見本誌提出数`}
                                className="w-20 text-right"
                                value={sampleQty[entry.itemId] ?? "0"}
                                onChange={(e) =>
                                  setSampleQty(entry.itemId, e.target.value)
                                }
                              />
                              <span className="text-muted-foreground">冊</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell numeric>
                          {movementsApplied ? (
                            displayQty[entry.itemId] || "0"
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                min={0}
                                aria-label={`${name}の展示見本数`}
                                className="w-20 text-right"
                                value={displayQty[entry.itemId] ?? "0"}
                                onChange={(e) =>
                                  setDisplayQty(entry.itemId, e.target.value)
                                }
                              />
                              <span className="text-muted-foreground">冊</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </section>

            {!movementsApplied && (
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={handleSaveStock}
                  disabled={!stockDirty}
                >
                  在庫情報を保存
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "cash" && (
          <section className="flex flex-col gap-6">
            <h2 className="text-lg font-bold">レジ金</h2>
            {cashDiff !== null && (
              <Alert variant={cashDiff === 0 ? "success" : "warning"}>
                <span className="mr-2 font-bold">レジ金差異</span>
                {cashDiff === 0
                  ? "±0（一致）"
                  : cashDiff > 0
                    ? `+${formatYen(cashDiff)}（過剰）`
                    : `-${formatYen(Math.abs(cashDiff))}（不足）`}
              </Alert>
            )}
            <div className="flex flex-wrap gap-8">
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-bold">開始時レジ金</h3>
                <CashCountInput value={openingCash} onChange={setOpeningCash} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-bold">終了時レジ金</h3>
                <CashCountInput value={closingCash} onChange={setClosingCash} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-base font-bold">レジ金増減</h3>
              <Table>
                <TableBody>
                  {cashAdjustments.map((adj, i) => {
                    const amount = cashAdjustmentAmount(adj);
                    return (
                      <TableRow
                        key={adj.occurredAt}
                        className={
                          editingCashAdjIndex === i
                            ? "bg-info-muted"
                            : undefined
                        }
                      >
                        <TableCell className="text-muted-foreground align-top text-xs">
                          {formatTime(new Date(adj.occurredAt).toISOString())}
                        </TableCell>
                        <TableCell
                          numeric
                          className={`align-top font-bold ${amount >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {amount >= 0 ? "+" : ""}
                          {formatYen(amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-normal">
                          <div>
                            入れた: {formatDenominationCounts(adj.cashIn)}
                          </div>
                          <div>
                            出した: {formatDenominationCounts(adj.cashOut)}
                          </div>
                          {adj.comment && <div>{adj.comment}</div>}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="text"
                              onClick={() => handleEditCashAdj(i)}
                            >
                              編集
                            </Button>
                            <Button
                              size="icon"
                              aria-label="削除"
                              onClick={() => handleDeleteCashAdj(i)}
                            >
                              <X aria-hidden="true" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-surface-muted text-muted-foreground">
                    <TableCell className="text-xs">販売</TableCell>
                    <TableCell numeric className="text-success font-bold">
                      +{formatYen(salesTotal)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {session.transactions.filter((t) => !t.cancelled).length}
                      件
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-muted-foreground text-sm">
                出し入れの合計{" "}
                {formatYen(cashAdjustmentsTotal(cashAdjustments))}
              </p>
              <Card>
                <div className="flex max-w-sm flex-col gap-3">
                  <CashAdjustmentForm
                    value={cashAdjFields}
                    onChange={setCashAdjFields}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleSubmitCashAdj}
                      disabled={newCashAdj === null}
                    >
                      {editingCashAdjIndex === null ? "追加" : "更新"}
                    </Button>
                    {editingCashAdjIndex !== null && (
                      <Button
                        variant="text"
                        onClick={() => {
                          setCashAdjFields(emptyCashAdjustmentFields());
                          setEditingCashAdjIndex(null);
                        }}
                      >
                        やめる
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={handleSaveCash}
                disabled={!cashDirty2}
              >
                レジ金を保存
              </Button>
            </div>
          </section>
        )}

        {activeTab === "consignment" && (
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-bold">委託元</h2>
              <p className="text-muted-foreground text-sm">
                委託品がある場合は委託元を入力してください。
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead>委託元</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {session.menu.map((entry) => {
                    const name = itemName(entry.itemId);
                    return (
                      <TableRow key={entry.itemId}>
                        <TableCell className="font-bold">{name}</TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            aria-label={`${name}の委託元`}
                            className="w-48"
                            value={consignors[entry.itemId] ?? ""}
                            placeholder="委託元名（任意）"
                            onChange={(e) =>
                              setConsignor(entry.itemId, e.target.value)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={handleSaveConsignors}
                  disabled={!consignorsDirty}
                >
                  委託元を保存
                </Button>
              </div>
            </section>

            {/* 保存済みの委託元データ（session の menu）で集計する。フォームの未保存値は含めない */}
            <ConsignmentSummary session={session} itemName={itemName} />
          </div>
        )}
      </div>
    </Page>
  );
}
