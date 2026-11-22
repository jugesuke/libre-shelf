import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import type {
  EventSessionV20261121,
  ItemDifference,
  MenuEntry,
} from "@libre-shared/entity/event/v2026-11-21/event-session";

/** 前日準備の、アプリごとに違う入力。`usePreparationEventInput` が返す */
export type PreparationEventInput = {
  /** 「イベント」の欄。入力の状態は、アプリが持つ */
  field: ReactNode;
  /**
   * 自サークルの頒布物の行に出す数の欄の中身。出さないアプリは null を渡し、
   * 画面は使えない欄（「—」）を出す
   */
  ownQuantityCell: ((entry: MenuEntry) => ReactNode) | null;
  /** 入力が足りなければ欄に理由を出し、false を返す。足りていれば true を返す */
  validate: () => boolean;
  /**
   * 入力をセッションに書き込んで返す。引数のセッションは、共通の入力（開催日、おしながき、預かり部数）を
   * 反映し終えたもの。呼ぶのは `validate` が true を返したあと
   */
  applyTo: (session: EventSessionV20261121) => EventSessionV20261121;
  /**
   * 商品の委託元名が、空から空でない値に、または空でない値から空に変わったときに呼ぶ。
   * 持ち込み予定数など、委託物かどうかで意味が変わる入力を空にするために使う。使わないアプリは渡さない
   */
  onConsignorChange?: (itemId: string) => void;
};

/** 当日開始処理で、自サークルの頒布物の持ち込み数の基準を決めるためのもの。`useOpeningStock` が返す */
export type OpeningStock = {
  /** 商品 ID から、自サークルの頒布物の持ち込み数の基準への対応。ない商品は 0 として扱う */
  baseline: ReadonlyMap<string, number>;
  /** 基準を取っている最中か */
  loading: boolean;
  /** 基準を取れなかったときの理由。取れていれば null */
  error: string | null;
  /**
   * 基準を取り直す操作。`run` は取り直す関数、`label` は取り直すボタンの名前。
   * 取り直せないアプリは null を渡し、画面は取り直すボタンを出さない
   */
  reload: { run: () => void; label: string } | null;
  /** 自サークルの頒布物の基準を、この画面で直せるようにするアプリだけが渡す */
  ownBaselineEditor?: {
    /** 商品の基準の入力欄の文字列 */
    value: (itemId: string) => string;
    onChange: (itemId: string, value: string) => void;
    /** 基準が不正な商品の ID */
    invalidIds: ReadonlySet<string>;
    /** 不正な基準の入力欄の下に出す理由 */
    errorMessage: string;
    /** 入力を確かめ、不正なら理由を出して false を返す */
    validate: () => boolean;
    /** 直した基準を、保存するセッションに反映して返す */
    applyTo: (session: EventSessionV20261121) => EventSessionV20261121;
  };
};

/** 当日終了処理で、在庫が一致したときの処理の結果 */
export type ClosingMatchedResult =
  | { ok: true }
  /** `message` は、進むボタンの左のアラートに出す文言 */
  | { ok: false; message: string };

/** 当日終了処理で、在庫が一致したときに渡す内容 */
export type ClosingMatchedInput = {
  session: EventSessionV20261121;
  /** 商品 ID から、キャンセルを除いた販売数への対応 */
  salesQty: ReadonlyMap<string, number>;
  /** 販売を記録する時刻（ISO 8601） */
  occurredAt: string;
};

/** イベント終了の、在庫を確定する欄の props */
export type DoneStockSectionProps = {
  session: EventSessionV20261121;
  /** 画面の入力から、実在庫と理論在庫の差がある商品を並べたもの。差がなければ空 */
  currentDiff: ItemDifference[];
  /** 画面の入力を反映したセッションを作る */
  buildUpdatedSession: () => EventSessionV20261121;
  salesQty: ReadonlyMap<string, number>;
  onSessionUpdate: (session: EventSessionV20261121) => void;
};

/** イベント終了の、終わったセッションの行き先へ送る操作の props */
export type DoneFinishProps = {
  session: EventSessionV20261121;
  /** 在庫を確定済みか（`stockDifference` が空の配列か） */
  stockConfirmed: boolean;
  /** 保存していない入力があるか */
  hasUnsavedInput: boolean;
  onSessionUpdate: (session: EventSessionV20261121) => void;
  /** 送り終えたあとに呼ぶ */
  onComplete: () => void;
};

/** 即売会の画面の、アプリごとに違う部分。アプリが `EventAdapterProvider` で渡す */
export type EventAdapter = {
  /** 前日準備の入力。フックとして呼ぶ。`initialSession` は、フォームの初期値にするセッション（なければ null） */
  usePreparationEventInput: (initialSession: EventSessionV20261121 | null) => PreparationEventInput;
  /** `usePreparationEventInput` の入力を、初期状態に戻す */
  resetPreparationEventInput: () => void;
  /** 当日開始処理の、持ち込み数の基準。フックとして呼ぶ */
  useOpeningStock: (session: EventSessionV20261121) => OpeningStock;
  /** 当日終了処理で、在庫が一致したときに呼ぶ。失敗したら `ok: false` と、画面に出す文言を返す */
  onClosingMatched: (input: ClosingMatchedInput) => Promise<ClosingMatchedResult>;
  /** イベント終了の、在庫を確定する欄 */
  DoneStockSection: ComponentType<DoneStockSectionProps>;
  /** イベント終了の、終わったセッションの行き先へ送る操作 */
  DoneFinish: ComponentType<DoneFinishProps>;
  /**
   * レジの商品・価格編集を保存するときに、`after`（編集の結果を反映したセッション）を、
   * アプリが持つ項目に合わせて直して返す。`before` は編集前のセッション。直す項目がないアプリは渡さない
   */
  applyMenuEdit?: (before: EventSessionV20261121, after: EventSessionV20261121) => EventSessionV20261121;
};

const EventAdapterContext = createContext<EventAdapter | null>(null);

/** 即売会の画面に、アプリごとに違う部分を渡す */
export const EventAdapterProvider = EventAdapterContext.Provider;

/** `EventAdapterProvider` で渡したものを返す。渡されていなければ例外を投げる */
export const useEventAdapter = (): EventAdapter => {
  const adapter = useContext(EventAdapterContext);
  if (!adapter) throw new Error("EventAdapterProvider の中で使ってください");
  return adapter;
};
