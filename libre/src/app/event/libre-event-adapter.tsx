import { useEffect, useMemo, useState } from "react";
import type { EventSessionV20261121, MenuEntry } from "@libre-shared/entity/event/v2026-11-21/event-session";
import type { EventAdapter, DoneFinishProps, DoneStockSectionProps } from "@libre/pages/event/event-adapter";
import { menuProductName } from "@libre/common/event-session/menu-entry";
import { usePreparationFormStore } from "@libre/common/event-session/preparation-form-store";
import { formatSessionTime } from "@libre/common/event-session/session-time";
import { downloadJson } from "@libre/common/download";
import { addRecord, buildSessionExport } from "@libre/data/local/history-storage";
import { Alert } from "@shelf/ui/components/alert";
import { Button } from "@shelf/ui/components/button";
import { Field } from "@shelf/ui/components/field";
import { Input } from "@shelf/ui/components/input";
import { canExportJson, canSaveToHistory, historyMessage, saveButtonVariant } from "./history-gate";
import { useLibrePreparationStore } from "./libre-preparation-store";
import {
  PLANNED_QTY_ERROR,
  buildPlannedStock,
  invalidPlannedItemIds,
  plannedStockAfterMenuEdit,
  readPlannedStock,
  toLibreSession,
} from "./libre-session";

const EVENT_NAME_ERROR = "イベントの名前を入力してください。";
const SAVE_FAILED_MESSAGE =
  "履歴に保存できませんでした。端末の空き容量を確認して、もう一度保存してください。";

/** 前日準備の、自サークルの頒布物の行の持ち込み予定数の入力欄 */
function PlannedQuantityCell({ entry }: { entry: MenuEntry }) {
  const value = useLibrePreparationStore((s) => s.plannedQty[entry.itemId] ?? "");
  const invalid = useLibrePreparationStore((s) => s.invalidPlannedIds.has(entry.itemId));
  const setPlannedQty = useLibrePreparationStore((s) => s.setPlannedQty);
  const errorId = `planned-qty-error-${entry.itemId}`;
  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Input
          type="number"
          min={0}
          step={1}
          aria-label={`${entry.productName}の持ち込み予定数`}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={invalid ? errorId : undefined}
          className="w-28 text-right"
          value={value}
          placeholder="必須"
          onChange={(e) => setPlannedQty(entry.itemId, e.target.value)}
        />
        <span className="text-muted-foreground">冊</span>
      </div>
      {invalid && (
        <p id={errorId} className="text-destructive-muted-foreground mt-1 text-xs">
          {PLANNED_QTY_ERROR}
        </p>
      )}
    </>
  );
}

/** イベント終了の「在庫を確定する」の区画 */
function DoneStockSection({ session, currentDiff, buildUpdatedSession, onSessionUpdate }: DoneStockSectionProps) {
  const confirmed = session.stockDifference !== null && session.stockDifference.length === 0;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">在庫の確定</h2>
      {confirmed ? (
        <Alert variant="success">在庫を確定しました。</Alert>
      ) : (
        <>
          {currentDiff.length === 0 ? (
            <Alert variant="success">在庫差異はありません。在庫を確定できます。</Alert>
          ) : (
            <Alert variant="warning">
              <p className="font-bold">在庫差異があります</p>
              <ul className="mt-1 flex flex-col gap-1">
                {currentDiff.map((d) => (
                  <li key={d.itemId}>
                    {menuProductName(session.menu, d.itemId)}：{d.difference > 0 ? `+${d.difference}` : d.difference} 部
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                差異の原因を調査し、下の入力値を修正してから再確認してください。
              </p>
            </Alert>
          )}
          <div>
            <Button
              variant="primary"
              disabled={currentDiff.length > 0}
              onClick={() => onSessionUpdate({ ...buildUpdatedSession(), stockDifference: [] })}
            >
              在庫を確定する
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

/** イベント終了の、「ファイルに書き出す」と「履歴に保存」 */
function DoneFinish({ session, hasUnsavedInput, onSessionUpdate, onComplete }: DoneFinishProps) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const gate = { stockDifference: session.stockDifference, hasUnsavedInput };
  const notice = session.settled ? null : historyMessage(gate);

  const handleExport = () => {
    const { fileName, content } = buildSessionExport(toLibreSession(session), formatSessionTime(new Date()));
    downloadJson(fileName, content);
  };

  const handleSave = () => {
    setSaveError(null);
    try {
      const result = addRecord(localStorage, {
        id: crypto.randomUUID(),
        savedAt: formatSessionTime(new Date()),
        session: toLibreSession(session),
      });
      if (!result.ok) throw new Error(result.reason);
    } catch (error) {
      console.error("Failed to save session to history:", error);
      setSaveError(SAVE_FAILED_MESSAGE);
      return;
    }
    onSessionUpdate({ ...session, settled: true });
    onComplete();
  };

  return (
    <div className="flex min-h-14 flex-wrap items-center justify-end gap-3">
      {notice !== null && <Alert variant="warning">{notice}</Alert>}
      {saveError && (
        <Alert variant="destructive" className="flex-1">
          {saveError}
        </Alert>
      )}
      <Button variant="secondary" onClick={handleExport} disabled={!canExportJson({ hasUnsavedInput })}>
        ファイルに書き出す
      </Button>
      <Button variant={saveButtonVariant(session.stockDifference)} onClick={handleSave} disabled={!canSaveToHistory(gate)}>
        履歴に保存
      </Button>
    </div>
  );
}

/** Libre Shelf が即売会の画面に渡すもの。即売会の名前と持ち込み予定数を持ち、履歴は端末に保存する */
export const libreEventAdapter: EventAdapter = {
  usePreparationEventInput: (initialSession) => {
    const eventName = useLibrePreparationStore((s) => s.eventName);
    const eventNameError = useLibrePreparationStore((s) => s.eventNameError);
    const { initializeFromSession, setEventName } = useLibrePreparationStore.getState();

    useEffect(() => {
      initializeFromSession(initialSession);
    }, [initializeFromSession, initialSession]);

    return {
      field: (
        <Field label="イベント" required error={eventNameError}>
          <Input
            type="text"
            value={eventName}
            placeholder="例: コミックマーケット107"
            onChange={(e) => setEventName(e.target.value)}
          />
        </Field>
      ),
      ownQuantityCell: (entry) => <PlannedQuantityCell entry={entry} />,
      validate: () => {
        const { eventName: name, plannedQty, setErrors } = useLibrePreparationStore.getState();
        const nameError = name.trim() === "" ? EVENT_NAME_ERROR : undefined;
        const invalid = invalidPlannedItemIds(usePreparationFormStore.getState().menu, plannedQty);
        setErrors(nameError, invalid);
        return nameError === undefined && invalid.size === 0;
      },
      applyTo: (session) => {
        const { eventName: name, plannedQty } = useLibrePreparationStore.getState();
        const libre = {
          ...session,
          eventName: name.trim(),
          plannedStock: buildPlannedStock(session.menu, plannedQty),
        };
        return libre;
      },
      onConsignorChange: (itemId) => useLibrePreparationStore.getState().clearPlanned(itemId),
    };
  },

  resetPreparationEventInput: () => useLibrePreparationStore.getState().reset(),

  useOpeningStock: (session) => {
    const [edits, setEdits] = useState<Record<string, string>>(() =>
      Object.fromEntries(readPlannedStock(session).map((p) => [p.itemId, String(p.quantity)])),
    );
    const [invalidIds, setInvalidIds] = useState<ReadonlySet<string>>(new Set());
    return useMemo(
      () => ({
        baseline: new Map(session.menu.map((e) => [e.itemId, Number(edits[e.itemId]) || 0])),
        loading: false,
        error: null,
        reload: null,
        ownBaselineEditor: {
          value: (itemId: string) => edits[itemId] ?? "",
          onChange: (itemId: string, value: string) => {
            setEdits((prev) => ({ ...prev, [itemId]: value }));
            setInvalidIds((prev) => new Set([...prev].filter((id) => id !== itemId)));
          },
          invalidIds,
          errorMessage: PLANNED_QTY_ERROR,
          validate: () => {
            const invalid = invalidPlannedItemIds(session.menu, edits);
            setInvalidIds(invalid);
            return invalid.size === 0;
          },
          applyTo: (built: EventSessionV20261121) => {
            const next = { ...built, plannedStock: buildPlannedStock(built.menu, edits) };
            return next;
          },
        },
      }),
      [session, edits, invalidIds],
    );
  },

  // 在庫管理に反映する先がないので、一致したときの処理はない
  onClosingMatched: async () => ({ ok: true }),

  DoneStockSection,
  DoneFinish,

  applyMenuEdit: (before, after) => {
    const edited = { ...after, plannedStock: plannedStockAfterMenuEdit(before, after) };
    return edited;
  },
};
