import type { Item } from "@libre-shared/entity/items/item";
import { STORAGE_FULL_STATUS, type ItemRepository, type RepoResult, type Repositories } from "../repositories";
import type { IsdnFetchFailure, IsdnFetchResult } from "./fetch-isdn";
import {
  addItem,
  generateUniqueItemId,
  loadItems,
  removeItem,
  updateItem,
  type KeyValueStorage,
  type WriteResult,
} from "./item-store";

/** ISDN の取得の失敗の理由を、中継 API が返すステータスコードに戻す。画面はこの値で文言を選ぶ */
const STATUS_BY_FAILURE: Readonly<Record<Exclude<IsdnFetchFailure, "offline">, number>> = {
  not_found: 404,
  unavailable: 502,
  incomplete: 400,
  invalid_isdn: 422,
  other: 500,
};

const STATUS_BY_WRITE_FAILURE: Readonly<Record<Extract<WriteResult, { ok: false }>["reason"], number>> = {
  unreadable: 500,
  write_failed: STORAGE_FULL_STATUS,
  duplicate: 409,
  not_found: 404,
};

const fromWrite = <T>(result: WriteResult, value: T): RepoResult<T> =>
  result.ok
    ? { ok: true, value }
    : { ok: false, status: STATUS_BY_WRITE_FAILURE[result.reason], detail: result.reason };

/**
 * 端末の localStorage に商品を持つ、`ItemRepository` を含むリポジトリを作る。
 * 保存先は端末の中なので、届かないことはなく、例外を投げるのは ISDN の取得で応答が返らなかったときだけ
 *
 * @param storage 画面からは `localStorage` を渡す
 * @param fetchIsdn 中継 API で ISDN の情報を取得する関数
 */
export const createLocalRepositories = (deps: {
  storage: KeyValueStorage;
  fetchIsdn: (isdn: string) => Promise<IsdnFetchResult>;
}): Repositories => {
  const { storage, fetchIsdn } = deps;

  /** 取得して、失敗なら理由に合わせた失敗の結果を返す。応答が返らなければ例外を投げる */
  const fetchOrFail = async (isdn: string): Promise<RepoResult<Item>> => {
    const fetched = await fetchIsdn(isdn);
    if (fetched.ok) return { ok: true, value: fetched.item };
    if (fetched.reason === "offline") throw new Error("ISDN の情報の取得で応答が返りませんでした");
    return { ok: false, status: STATUS_BY_FAILURE[fetched.reason], detail: fetched.reason };
  };

  const items: ItemRepository = {
    list: async ({ limit, offset }) => {
      const loaded = loadItems(storage);
      return loaded.ok
        ? { ok: true, value: loaded.items.slice(offset, offset + limit) }
        : { ok: false, status: 500, detail: "unreadable" };
    },
    get: async (itemId) => {
      const loaded = loadItems(storage);
      if (!loaded.ok) return { ok: false, status: 500, detail: "unreadable" };
      const found = loaded.items.find((i) => i.item_id === itemId);
      return found ? { ok: true, value: found } : { ok: false, status: 404, detail: "not_found" };
    },
    add: async (input) => {
      const loaded = loadItems(storage);
      if (!loaded.ok) return { ok: false, status: 500, detail: "unreadable" };
      const item: Item = { ...input, item_id: generateUniqueItemId(loaded.items) };
      return fromWrite(addItem(storage, item), item);
    },
    update: async (itemId, input) => {
      const item: Item = { ...input, item_id: itemId };
      return fromWrite(updateItem(storage, item), item);
    },
    remove: async (itemId) => fromWrite(removeItem(storage, itemId), undefined),
    addByIsdn: async (isdn) => {
      const loaded = loadItems(storage);
      if (!loaded.ok) return { ok: false, status: 500, detail: "unreadable" };
      if (loaded.items.some((i) => i.item_id === isdn)) {
        return { ok: false, status: 409, detail: "duplicate" };
      }
      const fetched = await fetchOrFail(isdn);
      return fetched.ok ? fromWrite(addItem(storage, fetched.value), fetched.value) : fetched;
    },
    syncIsdn: async (isdn) => {
      const fetched = await fetchOrFail(isdn);
      return fetched.ok ? fromWrite(updateItem(storage, fetched.value), fetched.value) : fetched;
    },
  };

  return { items };
};
