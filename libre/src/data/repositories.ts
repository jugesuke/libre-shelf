import type { Item, NewItem } from "@libre-shared/entity/items/item";

/**
 * リポジトリの結果。保存先が応答を返したときは、成功なら `value`、失敗なら `status`（HTTP のステータスコードに当たる値）と
 * `detail`（ログに出すための失敗の中身）を返す。保存先に届かなかったときは、結果を返さずに例外を投げる
 */
export type RepoResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; detail: string };

/**
 * 端末の保存先に書けなかったことを表す失敗のステータス。HTTP の 507（Insufficient Storage）に当たる。
 * 端末に商品を持つアプリのリポジトリだけが返す
 */
export const STORAGE_FULL_STATUS = 507;

/** 商品を足すときと直すときに渡す内容 */
export type ItemInput = NewItem;

/** 商品の読み書き */
export type ItemRepository = {
  list(page: { limit: number; offset: number }): Promise<RepoResult<Item[]>>;
  get(itemId: string): Promise<RepoResult<Item>>;
  add(item: ItemInput): Promise<RepoResult<Item>>;
  update(itemId: string, item: ItemInput): Promise<RepoResult<unknown>>;
  remove(itemId: string): Promise<RepoResult<unknown>>;
  /** ISDN の情報を取得して、商品として足す */
  addByIsdn(isdn: string): Promise<RepoResult<Item>>;
  /** ISDN の情報を取得し直して、商品を上書きする */
  syncIsdn(isdn: string): Promise<RepoResult<Item>>;
};

/** 即売会の一覧の 1 行 */
export type EventSessionSummary = {
  id: number;
  event_location_id: number;
  event_location_name: string;
  event_date: string;
  uploaded_at: string;
};

/** 終わった即売会の 1 件 */
export type EventSessionDetail = EventSessionSummary & {
  /** 即売会のセッションの JSON。`schemaVersion` で形が決まる */
  session_json: string;
};

/** 終わった即売会のセッションの読み出し */
export type EventSessionRepository = {
  list(): Promise<RepoResult<EventSessionSummary[]>>;
  get(id: string): Promise<RepoResult<EventSessionDetail>>;
};

/** 商品ごとの在庫の数の読み出し */
export type ItemStockRepository = {
  /** 商品の、すべての在庫ロケーションを合わせた在庫の数 */
  getItemQuantity(itemId: string): Promise<RepoResult<{ quantity: number }>>;
};

/** 画面とロジックが使うリポジトリ。アプリが実装を選んで渡す */
export type Repositories = {
  items: ItemRepository;
  /** 即売会の一覧と結果画面を共通の画面で出すアプリだけが渡す */
  eventSessions?: EventSessionRepository;
  /** 在庫の数を持つアプリだけが渡す。渡されなければ、商品の一覧に在庫の数を出さない */
  itemStocks?: ItemStockRepository;
};
