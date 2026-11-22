import { formatDenomination, formatTime, formatYen } from "@libre/common/format";
import { X } from "lucide-react";
import type {
  DenominationCounts,
  EventSessionV20261121,
  ItemQuantity,
  ItemQuantityWithTime,
  Transaction,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { CashAdjustmentForm } from "@libre/common/event-session/CashAdjustmentForm";
import { DiscardSessionDialog } from "@libre/common/event-session/DiscardSessionDialog";
import { CashCountInput } from "@libre/common/event-session/CashCountInput";
import {
  DENOMINATION_KEYS,
  addTendered,
  cashAdjustmentFromFields,
  emptyCashAdjustmentFields,
  emptyCounts,
  formatDenominationCounts,
} from "@libre/common/event-session/cash-form";
import {
  cashAdjustmentsTotal,
  salesTotal as calcSalesTotal,
} from "@libre/common/event-session/cash-summary";
import {
  DENOMINATION_VALUES,
  cashAdjustmentAmount,
  cashCountAmount,
  denominationCountsAmount,
} from "@libre/common/event-session/change-review";
import { useOpeningFormStore } from "@libre/common/event-session/opening-form-store";
import { CameraButton } from "@libre/common/barcode/camera-modal";
import { SummaryModal } from "./summary-modal";
import { MenuEditModal } from "./menu-edit-modal";
import { useEventAdapter } from "@libre/pages/event/event-adapter";
import { canCheckout } from "./checkout-gate";
import {
  menuProductName,
  menuPublisherName,
} from "@libre/common/event-session/menu-entry";
import { buildTransactionItems } from "./checkout-items";
import { formatSessionTime } from "@libre/common/event-session/session-time";
import { Badge } from "@shelf/ui/components/badge";
import { Button } from "@shelf/ui/components/button";
import { ConfirmDialog } from "@shelf/ui/components/confirm-dialog";
import { Dialog } from "@shelf/ui/components/dialog";
import { FloatingAlert } from "@shelf/ui/components/floating-alert";
import { Input } from "@shelf/ui/components/input";
import { Page } from "@shelf/ui/components/page";
import { SegmentedControl } from "@shelf/ui/components/segmented-control";
import { Select } from "@shelf/ui/components/select";
import { useToast } from "@shelf/ui/components/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@shelf/ui/components/table";
import { cn } from "@shelf/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

type CartItem = {
  itemId: string;
  price: number;
  quantity: number;
};

type ScanMode = "barcode" | "manual" | "select";

type Props = {
  session: EventSessionV20261121;
  onSessionUpdate: (session: EventSessionV20261121) => void;
  onDiscard: () => void;
  onProceedToClosing: () => void;
};

export function RegisterPage({
  session,
  onSessionUpdate,
  onDiscard,
  onProceedToClosing,
}: Props) {
  const { showToast } = useToast();
  const { applyMenuEdit } = useEventAdapter();

  // カート
  const [cart, setCart] = useState<CartItem[]>([]);

  // 入力モード
  const [scanMode, setScanMode] = useState<ScanMode>("barcode");

  // 開始処理編集モーダル
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const {
    openingCash: openingCashInput,
    sampleQty,
    displayQty,
    openingStockQty,
    initializeFromSession,
    setOpeningCash: setOpeningCashInput,
    setSampleQty,
    setDisplayQty,
    setOpeningStockQty,
  } = useOpeningFormStore();

  useEffect(() => {
    initializeFromSession(session);
  }, [initializeFromSession, session]);

  // 集計モーダル
  const [showSummary, setShowSummary] = useState(false);

  // 会計一覧モーダル
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Transaction | null>(null);

  // 破棄確認
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // 商品・価格編集モーダル
  const [showMenuEditModal, setShowMenuEditModal] = useState(false);

  // レジ金増減モーダル
  const [showCashAdjModal, setShowCashAdjModal] = useState(false);
  const [cashAdjFields, setCashAdjFields] = useState(emptyCashAdjustmentFields);
  const newCashAdj = cashAdjustmentFromFields(cashAdjFields, "");

  const handleAddCashAdj = () => {
    const adjustment = cashAdjustmentFromFields(
      cashAdjFields,
      formatSessionTime(new Date()),
    );
    if (adjustment === null) return;
    onSessionUpdate({
      ...session,
      cashAdjustments: [...session.cashAdjustments, adjustment],
    });
    setCashAdjFields(emptyCashAdjustmentFields());
  };

  const handleDeleteCashAdj = (index: number) => {
    onSessionUpdate({
      ...session,
      cashAdjustments: session.cashAdjustments.filter((_, i) => i !== index),
    });
  };

  // お釣り計算。押した金種のボタンの回数を、金種ごとの枚数で持つ
  const [tendered, setTendered] = useState<DenominationCounts>(emptyCounts);

  // テキスト入力
  const [scanValue, setScanValue] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const scanRowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // バーコード・手打ちモードではフォーカスを維持（モード切替・カート更新後も再フォーカス）
  useEffect(() => {
    if (scanMode !== "select") {
      inputRef.current?.focus();
    }
  }, [cart, scanError, scanMode]);

  // 初回マウント時のフォーカス
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAddById = (id: string) => {
    const menuEntry = session.menu.find((e) => e.itemId === id);
    if (!menuEntry) {
      setScanError("おしながきに登録されていない商品です。");
      return;
    }
    setScanError(null);
    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === id);
      if (existing) {
        return prev.map((c) =>
          c.itemId === id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { itemId: id, price: menuEntry.price, quantity: 1 }];
    });
  };

  const handleTextConfirm = () => {
    const id = scanValue.trim();
    if (!id) return;
    setScanValue("");
    handleAddById(id);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.key !== "Enter") return;
    handleTextConfirm();
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    handleAddById(id);
    e.target.value = "";
  };

  const handleRemoveOne = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.itemId === itemId ? { ...c, quantity: c.quantity - 1 } : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const tenderedAmount = denominationCountsAmount(tendered);

  const resetChangeCalc = () => {
    setTendered(emptyCounts());
  };

  const handleCheckout = (buyerType: Transaction["buyerType"]) => {
    if (!checkoutEnabled) return;
    const transaction: Transaction = {
      transactionId:
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      occurredAt: formatSessionTime(new Date()),
      buyerType,
      items: buildTransactionItems(cart, session.menu),
      tendered,
      changeAmount: tenderedAmount - total,
      cancelled: false,
    };
    const updated: EventSessionV20261121 = {
      ...session,
      transactions: [...session.transactions, transaction],
    };
    onSessionUpdate(updated);
    setCart([]);
    resetChangeCalc();
  };

  const handleCancelTransaction = (transactionId: string) => {
    const updated: EventSessionV20261121 = {
      ...session,
      transactions: session.transactions.map((t) =>
        t.transactionId === transactionId ? { ...t, cancelled: true } : t,
      ),
    };
    onSessionUpdate(updated);
    setCancelTarget(null);
  };

  const switchMode = (next: ScanMode) => {
    setScanMode(next);
    setScanValue("");
    setScanError(null);
  };

  const handleSaveOpening = () => {
    const now = formatSessionTime(new Date());
    const newSampleSubmissions: ItemQuantityWithTime[] = session.menu
      .map((entry) => {
        const qty = Number(sampleQty[entry.itemId] ?? "0");
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
        const qty = Number(displayQty[entry.itemId] ?? "0");
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
        const qty = Number(openingStockQty[entry.itemId] ?? "0");
        if (qty <= 0) return null;
        return { itemId: entry.itemId, quantity: qty };
      })
      .filter((e): e is ItemQuantity => e !== null);

    onSessionUpdate({
      ...session,
      openingCash: openingCashInput,
      sampleSubmissions: newSampleSubmissions,
      displaySamples: newDisplaySamples,
      openingStock: newOpeningStock,
    });
    setShowOpeningModal(false);
    showToast("開始処理を保存しました。");
  };

  const handleProceedToClosing = () => {
    onProceedToClosing();
  };

  const handleAddVisitor = () => {
    onSessionUpdate({
      ...session,
      visitorLogs: [...session.visitorLogs, { occurredAt: formatSessionTime(new Date()) }],
    });
  };

  const handleCancelLastVisitor = () => {
    const lastIndex = session.visitorLogs.length - 1;
    if (lastIndex < 0) return;
    onSessionUpdate({
      ...session,
      visitorLogs: session.visitorLogs.slice(0, lastIndex),
    });
  };

  const visitorCount = session.visitorLogs.length;

  const salesTotal = calcSalesTotal(session.transactions);
  const cashAdjTotal = cashAdjustmentsTotal(session.cashAdjustments);
  const registerBalance =
    session.openingCash !== null
      ? cashCountAmount(session.openingCash) + salesTotal + cashAdjTotal
      : null;

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const change = tenderedAmount > 0 ? tenderedAmount - total : null;
  const checkoutEnabled = canCheckout({
    cartLength: cart.length,
    total,
    tenderedAmount,
  });

  /** 開始処理の編集で、商品ごとに数を入力する節。 */
  const renderOpeningQtySection = (
    heading: string,
    note: string | null,
    unitLabel: string,
    valueOf: (itemId: string) => string,
    onChangeOf: (itemId: string, value: string) => void,
    placeholder?: string,
  ) => (
    <section className="flex flex-col gap-2">
      <h3 className="text-base font-bold">{heading}</h3>
      {note && <p className="text-muted-foreground text-sm">{note}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>商品名</TableHead>
            <TableHead numeric>{unitLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {session.menu.map((entry) => {
            const name = entry.productName;
            return (
              <TableRow key={entry.itemId}>
                <TableCell className="font-bold">{name}</TableCell>
                <TableCell numeric>
                  <div className="flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      min={0}
                      aria-label={`${name}の${unitLabel}`}
                      className="w-24 text-right"
                      value={valueOf(entry.itemId)}
                      placeholder={placeholder}
                      onChange={(e) => onChangeOf(entry.itemId, e.target.value)}
                    />
                    <span className="text-muted-foreground">冊</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );

  return (
    <Page
      title="レジ"
      width="wide"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowOpeningModal(true)}>
            開始処理を編集
          </Button>
          <Button onClick={() => setShowMenuEditModal(true)}>
            商品・価格編集
          </Button>
          <Button onClick={() => setShowSummary(true)}>集計確認</Button>
          <Button onClick={() => setShowCancelModal(true)}>
            会計一覧
            {session.transactions.length > 0 && (
              <span className="ml-1">
                ({session.transactions.filter((t) => !t.cancelled).length})
              </span>
            )}
          </Button>
          <Button
            disabled={session.openingCash === null}
            onClick={() => setShowCashAdjModal(true)}
          >
            レジ金増減
            {session.cashAdjustments.length > 0 && (
              <span className="ml-1">({session.cashAdjustments.length})</span>
            )}
          </Button>
          <Button onClick={handleProceedToClosing}>販売終了</Button>
          <Button variant="text" onClick={() => setShowDiscardConfirm(true)}>
            セッションを破棄する
          </Button>
        </div>
      }
    >
      {/* 商品・価格編集モーダル */}
      {showMenuEditModal && (
        <MenuEditModal
          session={session}
          onClose={() => setShowMenuEditModal(false)}
          onSave={(result) => {
            const edited = { ...session, ...result };
            onSessionUpdate(applyMenuEdit ? applyMenuEdit(session, edited) : edited);
            setShowMenuEditModal(false);
          }}
        />
      )}

      {/* 集計モーダル */}
      {showSummary && (
        <SummaryModal
          session={session}
          onClose={() => setShowSummary(false)}
        />
      )}

      {/* レジ金増減モーダル */}
      <Dialog
        open={showCashAdjModal}
        onOpenChange={setShowCashAdjModal}
        title="レジ金増減"
        size="md"
        footer={
          <Button
            variant="primary"
            onClick={handleAddCashAdj}
            disabled={newCashAdj === null}
          >
            記録
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <dl className="bg-surface-muted flex flex-col gap-1 rounded-md p-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">開始時レジ金</dt>
              <dd className="tabular-nums">
                {session.openingCash !== null
                  ? formatYen(cashCountAmount(session.openingCash))
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">販売合計</dt>
              <dd className="tabular-nums">+{formatYen(salesTotal)}</dd>
            </div>
            {cashAdjTotal !== 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">増減合計</dt>
                <dd
                  className={cn(
                    "tabular-nums",
                    cashAdjTotal >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {cashAdjTotal >= 0 ? "+" : ""}
                  {formatYen(cashAdjTotal)}
                </dd>
              </div>
            )}
            <div className="border-border-muted flex justify-between border-t pt-1 font-bold">
              <dt>レジ残高（計算値）</dt>
              <dd className="tabular-nums">
                {registerBalance !== null ? formatYen(registerBalance) : "—"}
              </dd>
            </div>
          </dl>

          {session.cashAdjustments.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead numeric>金額</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.cashAdjustments.map((adj, i) => {
                  const amount = cashAdjustmentAmount(adj);
                  return (
                    <TableRow key={adj.occurredAt}>
                      <TableCell>
                        {formatTime(new Date(adj.occurredAt).toISOString())}
                      </TableCell>
                      <TableCell
                        numeric
                        className={cn(
                          "font-bold",
                          amount >= 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {amount >= 0 ? "+" : ""}
                        {formatYen(amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div>
                          入れた: {formatDenominationCounts(adj.cashIn)}
                        </div>
                        <div>
                          出した: {formatDenominationCounts(adj.cashOut)}
                        </div>
                        {adj.comment && <div>{adj.comment}</div>}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          aria-label="この記録を削除"
                          onClick={() => handleDeleteCashAdj(i)}
                        >
                          削除
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <CashAdjustmentForm
            value={cashAdjFields}
            onChange={setCashAdjFields}
          />
        </div>
      </Dialog>

      <DiscardSessionDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        onDiscard={onDiscard}
      />

      {/* 会計一覧モーダル */}
      <Dialog
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        title="会計一覧"
        size="md"
        initialFocus="title"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>時刻・区分</TableHead>
              <TableHead>商品</TableHead>
              <TableHead numeric>合計</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {session.transactions.length === 0 ? (
              <TableEmpty colSpan={3} controlRows>
                会計がありません。「知り合い」か「知り合い以外」で会計すると表示されます。
              </TableEmpty>
            ) : (
              [...session.transactions].reverse().map((t) => {
                const txTotal = t.items.reduce(
                  (sum, i) => sum + i.price * i.quantity,
                  0,
                );
                return (
                  <TableRow
                    key={t.transactionId}
                    className={
                      t.cancelled ? "text-muted-foreground" : undefined
                    }
                  >
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span>
                          {formatTime(new Date(t.occurredAt).toISOString())}
                        </span>
                        <Badge
                          variant={
                            t.buyerType === "acquaintance" ? "info" : "gray"
                          }
                        >
                          {t.buyerType === "acquaintance"
                            ? "知り合い"
                            : "知り合い以外"}
                        </Badge>
                        {t.cancelled && (
                          <Badge variant="warning">取り消し済み</Badge>
                        )}
                        {!t.cancelled && (
                          <Button
                            variant="destructive"
                            onClick={() => setCancelTarget(t)}
                          >
                            取り消す
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-32 whitespace-normal">
                      {t.items.map((i) => {
                        return (
                          <div key={i.itemId}>
                            {i.productName} × {i.quantity}
                          </div>
                        );
                      })}
                    </TableCell>
                    <TableCell numeric className="font-bold">
                      {formatYen(txTotal)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Dialog>

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="会計の取り消し"
        message="以下の会計を取り消しますか？　この操作は元に戻せません。"
        target={
          cancelTarget
            ? [
                [
                  "時刻",
                  formatTime(new Date(cancelTarget.occurredAt).toISOString()),
                ],
                [
                  "区分",
                  cancelTarget.buyerType === "acquaintance"
                    ? "知り合い"
                    : "知り合い以外",
                ],
                [
                  "合計",
                  formatYen(
                    cancelTarget.items.reduce(
                      (sum, i) => sum + i.price * i.quantity,
                      0,
                    ),
                  ),
                ],
              ]
            : undefined
        }
        confirmLabel="取り消す"
        onConfirm={() => {
          if (cancelTarget) handleCancelTransaction(cancelTarget.transactionId);
        }}
      />

      {/* 開始処理編集モーダル */}
      <Dialog
        open={showOpeningModal}
        onOpenChange={setShowOpeningModal}
        title="開始処理を編集"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowOpeningModal(false)}
            >
              キャンセル
            </Button>
            <Button variant="primary" onClick={handleSaveOpening}>
              保存
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          {renderOpeningQtySection(
            "持ち込み在庫確認（実数）",
            null,
            "実在庫",
            (id) => openingStockQty[id] ?? "",
            setOpeningStockQty,
            "—",
          )}

          <section className="flex flex-col gap-2">
            <h3 className="text-base font-bold">開始時レジ金</h3>
            <CashCountInput
              value={openingCashInput}
              onChange={setOpeningCashInput}
            />
          </section>

          {renderOpeningQtySection(
            "見本誌提出数",
            "提出がない場合は0のままで構いません。",
            "提出数",
            (id) => sampleQty[id] ?? "0",
            setSampleQty,
          )}

          {renderOpeningQtySection(
            "展示見本数",
            "在庫を消費して事前に作成済みの場合は0のままで構いません。",
            "展示数",
            (id) => displayQty[id] ?? "0",
            setDisplayQty,
          )}
        </div>
      </Dialog>

      {/* 入力 + 合計 + 会計ボタン */}
      <div className="mb-3 flex flex-col gap-2">
        <SegmentedControl
          options={[
            { value: "barcode", label: "バーコード" },
            { value: "manual", label: "手打ち" },
            { value: "select", label: "一覧から選択" },
          ]}
          value={scanMode}
          onChange={switchMode}
          className="self-start"
        />

        {scanMode === "select" ? (
          <Select
            aria-label="商品を選択"
            onChange={handleSelectChange}
            defaultValue=""
          >
            <option value="" disabled>
              商品を選択してください
            </option>
            {session.menu.map((entry) => {
              return (
                <option key={entry.itemId} value={entry.itemId}>
                  {entry.productName}（{formatYen(entry.price)}
                  ）
                </option>
              );
            })}
          </Select>
        ) : (
          <div ref={scanRowRef} className="flex items-center gap-2">
            <Input
              key={scanMode}
              ref={inputRef}
              type="text"
              value={scanValue}
              onChange={(e) => {
                setScanValue(e.target.value);
                setScanError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                scanMode === "barcode" ? "バーコードをスキャン" : "商品IDを入力"
              }
              aria-label="商品ID"
              className="min-w-0 flex-1"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode={scanMode === "barcode" ? "none" : "numeric"}
            />
            <Button onClick={handleTextConfirm}>追加</Button>
            <CameraButton
              alignTop
              onRead={handleAddById}
              onClosed={() => inputRef.current?.focus()}
            />
          </div>
        )}
        <FloatingAlert
          anchor={scanRowRef}
          target={inputRef}
          message={scanError ?? ""}
          open={scanError !== null}
          onClose={() => setScanError(null)}
        />
      </div>

      {/* カート（左）＋ お釣り計算（右） */}
      <div className="border-border-muted flex flex-col gap-4 border-t pt-3 md:flex-row">
        {/* 左：カート一覧 */}
        <div className="min-w-0 flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead numeric>単価</TableHead>
                <TableHead numeric>数量</TableHead>
                <TableHead numeric>小計</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.length === 0 ? (
                <TableEmpty colSpan={5} controlRows>
                  カートに商品がありません。バーコードを読み取るか、商品を選ぶと追加されます。
                </TableEmpty>
              ) : (
                cart.map((c) => {
                  return (
                    <TableRow key={c.itemId}>
                      <TableCell>
                        <div className="font-bold">
                          {menuProductName(session.menu, c.itemId)}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {menuPublisherName(session.menu, c.itemId)}
                        </div>
                      </TableCell>
                      <TableCell numeric>{formatYen(c.price)}</TableCell>
                      <TableCell numeric className="text-lg font-bold">
                        {c.quantity}
                      </TableCell>
                      <TableCell numeric>
                        {formatYen(c.price * c.quantity)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          aria-label="1個削除"
                          onClick={() => handleRemoveOne(c.itemId)}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 右：お釣り計算 + 会計 */}
        <div className="border-border-muted flex w-full shrink-0 flex-col gap-3 md:w-72 md:border-l md:pl-4">
          {/* 合計 / 預かり / お釣り */}
          <div className="border-border-muted flex flex-col gap-1 border-b pb-3 text-right">
            <div>
              <span className="text-muted-foreground text-sm">合計 </span>
              <span className="text-primary text-2xl font-bold tabular-nums">
                {formatYen(total)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">預かり </span>
              <span className="text-lg font-bold tabular-nums">
                {tenderedAmount > 0 ? formatYen(tenderedAmount) : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">お釣り </span>
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  change === null
                    ? "text-muted-foreground"
                    : change < 0
                      ? "text-destructive"
                      : "text-success",
                )}
              >
                {change === null ? "—" : formatYen(change)}
              </span>
            </div>
          </div>

          {/* 金種のボタン（押した回数を預かった枚数として積み上げる） */}
          <div className="grid grid-cols-2 gap-2">
            {DENOMINATION_KEYS.map((key) => (
              <Button
                key={key}
                onClick={() => setTendered((p) => addTendered(p, key))}
              >
                {formatDenomination(DENOMINATION_VALUES[key])}
                {tendered[key] > 0 && (
                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                    × {tendered[key]}
                  </span>
                )}
              </Button>
            ))}
            <Button className="col-span-2" onClick={resetChangeCalc}>
              クリア
            </Button>
          </div>

          {/* 会計ボタン */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="primary"
              onClick={() => handleCheckout("acquaintance")}
              disabled={!checkoutEnabled}
            >
              知り合い
            </Button>
            <Button
              variant="primary"
              onClick={() => handleCheckout("stranger")}
              disabled={!checkoutEnabled}
            >
              知り合い以外
            </Button>

            {/* 来場者カウント */}
            <div className="border-border-muted mt-1 flex flex-col gap-1 border-t pt-3">
              <Button onClick={handleAddVisitor}>
                来場者 {visitorCount}人 +1
              </Button>
              {visitorCount > 0 && (
                <Button
                  variant="text"
                  className="self-end"
                  onClick={handleCancelLastVisitor}
                >
                  直前の来場者を取り消す
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
