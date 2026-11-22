import type {
  EventSessionV20261121,
  ItemQuantity,
  ItemQuantityWithTime,
  MenuEntry as MenuEntryType,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { formatSessionTime } from "@libre/common/event-session/session-time";
import { isConsignedItem } from "@libre-shared/entity/event/v2026-11-21/event-session";
import { DiscardSessionDialog } from "@libre/common/event-session/DiscardSessionDialog";
import { CashCountInput } from "@libre/common/event-session/CashCountInput";
import { useOpeningFormStore } from "@libre/common/event-session/opening-form-store";
import { Alert } from "@shelf/ui/components/alert";
import { Button } from "@shelf/ui/components/button";
import { Input } from "@shelf/ui/components/input";
import { Loader } from "@shelf/ui/components/loader";
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
};

export function OpeningPage({ session, onSessionUpdate, onDiscard }: Props) {
  const { useOpeningStock } = useEventAdapter();
  const t = useTexts("opening");
  const {
    baseline: theoreticalStock,
    loading: stockLoading,
    error: fetchError,
    reload,
    ownBaselineEditor,
  } = useOpeningStock(session);
  const [cashError, setCashError] = useState<string>();
  // 預かり部数が不正な委託物の itemId
  const [invalidQtyIds, setInvalidQtyIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const {
    openingCash,
    sampleQty,
    displayQty,
    openingStockQty,
    consignedStockQty,
    initializeFromSession,
    setOpeningCash,
    setSampleQty,
    setDisplayQty,
    setOpeningStockQty,
    setConsignedStockQty,
    reset: resetForm,
  } = useOpeningFormStore();

  useEffect(() => {
    initializeFromSession(session);
  }, [initializeFromSession, session]);

  // 破棄確認
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const buildUpdatedSession = (): EventSessionV20261121 => {
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

    const newConsignedStock: ItemQuantity[] = session.menu
      .filter(isConsignedItem)
      .map((entry) => {
        const existing = session.consignedStock.find(
          (s) => s.itemId === entry.itemId,
        );
        const qty = Number(
          consignedStockQty[entry.itemId] ?? existing?.quantity ?? "0",
        );
        return {
          itemId: entry.itemId,
          quantity: Number.isNaN(qty) ? 0 : qty,
        };
      });

    return {
      ...session,
      openingCash,
      sampleSubmissions: newSampleSubmissions,
      displaySamples: newDisplaySamples,
      openingStock: newOpeningStock,
      consignedStock: newConsignedStock,
    };
  };

  /**
   * 委託元名が入力されている商品すべてに、1以上の整数の預かり部数が入力されているか検証する。
   * 未入力・不正な値の商品の itemId を返す。
   */
  const findInvalidConsignedQty = (): ReadonlySet<string> =>
    new Set(
      session.menu
        .filter((entry) => {
          if (!isConsignedItem(entry)) return false;
          const existing = session.consignedStock.find(
            (s) => s.itemId === entry.itemId,
          );
          const quantity = Number(
            consignedStockQty[entry.itemId] ?? existing?.quantity ?? "0",
          );
          return !Number.isInteger(quantity) || quantity < 1;
        })
        .map((entry) => entry.itemId),
    );

  const handleSkip = () => {
    resetForm();
    onSessionUpdate({ ...session, phase: "register" });
  };

  const handleSave = () => {
    const invalidIds = findInvalidConsignedQty();
    setCashError(
      openingCash === null ? "開始時レジ金を入力してください。" : undefined,
    );
    setInvalidQtyIds(invalidIds);
    const ownBaselineValid = ownBaselineEditor ? ownBaselineEditor.validate() : true;
    if (openingCash === null || invalidIds.size > 0 || !ownBaselineValid) return;

    const built = buildUpdatedSession();
    const updated = ownBaselineEditor ? ownBaselineEditor.applyTo(built) : built;
    resetForm();
    onSessionUpdate({ ...updated, phase: "register" });
  };

  /**
   * 突合基準（持込部数）を返す。自サークル物はシステムの理論在庫、委託物はセッションの預かり部数（編集中の値があればそちら）を基準とする。
   */
  const getBaseline = (entry: MenuEntryType): number => {
    if (isConsignedItem(entry)) {
      const editing = consignedStockQty[entry.itemId];
      if (editing !== undefined) {
        const qty = Number(editing);
        return Number.isNaN(qty) ? 0 : qty;
      }
      const existing = session.consignedStock.find(
        (s) => s.itemId === entry.itemId,
      );
      return existing?.quantity ?? 0;
    }
    return theoreticalStock.get(entry.itemId) ?? 0;
  };

  const getStockDiff = (entry: MenuEntryType): number | null => {
    const actual = Number(openingStockQty[entry.itemId] ?? "");
    if (Number.isNaN(actual) || openingStockQty[entry.itemId] === undefined)
      return null;
    return actual - getBaseline(entry);
  };

  /** 商品名と、その下に補足（出版元など）を出すセル。 */
  const renderItemCell = (name: string, note: string | undefined) => (
    <TableCell>
      <div className="font-bold">{name}</div>
      <div className="text-muted-foreground text-xs">{note}</div>
    </TableCell>
  );

  return (
    <Page
      title="当日開始処理"
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
        onDiscard={() => {
          resetForm();
          onDiscard();
        }}
      />

      {fetchError && (
        <Alert variant="destructive" className="mb-4">
          {fetchError}
          {reload && (
            <Button variant="text" onClick={reload.run} className="ml-3">
              再試行
            </Button>
          )}
        </Alert>
      )}

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">持ち込み在庫確認</h2>
            {reload && (
              <Button variant="text" onClick={reload.run}>
                {reload.label}
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {t("stockIntro")}
          </p>
          {stockLoading && !fetchError && (
            <div className="text-muted-foreground">
              <Loader />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead numeric>持込部数</TableHead>
                <TableHead numeric>実在庫</TableHead>
                <TableHead numeric>差異</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.menu.map((entry) => {
                const diff = getStockDiff(entry);
                const consigned = isConsignedItem(entry);
                const name = entry.productName;
                const qtyInvalid = invalidQtyIds.has(entry.itemId);
                const qtyErrorId = `opening-qty-error-${entry.itemId}`;
                return (
                  <TableRow key={entry.itemId}>
                    {renderItemCell(
                      name,
                      consigned
                        ? `委託: ${entry.consignorName}`
                        : entry.publisherName,
                    )}
                    <TableCell numeric>
                      {consigned ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            aria-label={`${name}の持込部数`}
                            className="w-24 text-right"
                            value={
                              consignedStockQty[entry.itemId] ??
                              String(
                                session.consignedStock.find(
                                  (s) => s.itemId === entry.itemId,
                                )?.quantity ?? "",
                              )
                            }
                            aria-invalid={qtyInvalid ? true : undefined}
                            aria-describedby={qtyInvalid ? qtyErrorId : undefined}
                            onChange={(e) => {
                              setInvalidQtyIds(
                                (prev) =>
                                  new Set(
                                    [...prev].filter((id) => id !== entry.itemId),
                                  ),
                              );
                              setConsignedStockQty(entry.itemId, e.target.value);
                            }}
                          />
                          <span className="text-muted-foreground">冊</span>
                        </div>
                      ) : ownBaselineEditor ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            aria-label={`${name}の持込部数`}
                            className="w-24 text-right"
                            value={ownBaselineEditor.value(entry.itemId)}
                            aria-invalid={
                              ownBaselineEditor.invalidIds.has(entry.itemId) ? true : undefined
                            }
                            onChange={(e) =>
                              ownBaselineEditor.onChange(entry.itemId, e.target.value)
                            }
                          />
                          <span className="text-muted-foreground">冊</span>
                        </div>
                      ) : (
                        (theoreticalStock.get(entry.itemId) ?? 0)
                      )}
                      {ownBaselineEditor?.invalidIds.has(entry.itemId) && (
                        <p className="text-destructive-muted-foreground mt-1 text-xs">
                          {ownBaselineEditor.errorMessage}
                        </p>
                      )}
                      {qtyInvalid && (
                        <p
                          id={qtyErrorId}
                          className="text-destructive-muted-foreground mt-1 text-xs"
                        >
                          預かり部数を入力してください（1以上の整数）。
                        </p>
                      )}
                    </TableCell>
                    <TableCell numeric>
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          min={0}
                          aria-label={`${name}の実在庫`}
                          className="w-24 text-right"
                          value={openingStockQty[entry.itemId] ?? ""}
                          placeholder="—"
                          onChange={(e) =>
                            setOpeningStockQty(entry.itemId, e.target.value)
                          }
                        />
                        <span className="text-muted-foreground">冊</span>
                      </div>
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
          <h2 className="flex items-center gap-2 text-lg font-bold">
            開始時レジ金
            <span className="bg-destructive-muted text-destructive-muted-foreground rounded-full px-2 text-xs font-normal">
              必須
            </span>
          </h2>
          <p className="text-muted-foreground text-sm">
            釣り銭用に用意した現金を金種別に入力してください。
          </p>
          <CashCountInput
            value={openingCash}
            onChange={(value) => {
              setCashError(undefined);
              setOpeningCash(value);
            }}
          />
          {cashError && (
            <p className="text-destructive-muted-foreground text-xs">
              {cashError}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">見本誌提出数</h2>
          <p className="text-muted-foreground text-sm">
            準備会への提出分。提出がない場合は0のまま進んでください。
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead numeric>提出数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.menu.map((entry) => {
                const name = entry.productName;
                return (
                  <TableRow key={entry.itemId}>
                    {renderItemCell(name, entry.publisherName)}
                    <TableCell numeric>
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          min={0}
                          aria-label={`${name}の提出数`}
                          className="w-24 text-right"
                          value={sampleQty[entry.itemId] ?? "0"}
                          onChange={(e) =>
                            setSampleQty(entry.itemId, e.target.value)
                          }
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

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">展示見本数</h2>
          <p className="text-muted-foreground text-sm">
            {t("displaySampleNote")}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead numeric>展示数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.menu.map((entry) => {
                const name = entry.productName;
                return (
                  <TableRow key={entry.itemId}>
                    {renderItemCell(name, entry.publisherName)}
                    <TableCell numeric>
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          min={0}
                          aria-label={`${name}の展示数`}
                          className="w-24 text-right"
                          value={displayQty[entry.itemId] ?? "0"}
                          onChange={(e) =>
                            setDisplayQty(entry.itemId, e.target.value)
                          }
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

        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={handleSkip}>
            スキップしてレジへ進む
          </Button>
          <Button variant="primary" onClick={handleSave}>
            保存してレジへ進む
          </Button>
        </div>
      </div>
    </Page>
  );
}
