import type { BackendAppV1Type } from "@libre-worker/interfaces/server";
import type { Item } from "@libre-shared/entity/items/item";
import { isItem } from "./item-store";
import { hc } from "hono/client";

/** ISDN の取得の失敗の理由。 */
export type IsdnFetchFailure = "not_found" | "unavailable" | "incomplete" | "invalid_isdn" | "other" | "offline";

export type IsdnFetchResult = { ok: true; item: Item } | { ok: false; reason: IsdnFetchFailure };

const FAILURE_BY_STATUS: Readonly<Record<number, IsdnFetchFailure>> = {
  404: "not_found",
  502: "unavailable",
  400: "incomplete",
  422: "invalid_isdn",
};

/** 中継 API で ISDN の情報を取得し、失敗は応答のステータスコードで理由を見分けて返す。ステータスコードと中身はコンソールに出す。 */
export const fetchIsdnResult = async (isdn: string): Promise<IsdnFetchResult> => {
  try {
    const res = await hc<BackendAppV1Type>("").api.v1.isdn[":isdn"].$get({
      param: { isdn },
    });
    if (!res.ok) {
      console.error("Failed to fetch ISDN item:", res.status, await res.text().catch(() => ""));
      return { ok: false, reason: FAILURE_BY_STATUS[res.status] ?? "other" };
    }
    // 応答が返っていれば、JSON として読めないのも `Item` の形でないのと同じ失敗にする
    const body: unknown = await res.json().catch(() => undefined);
    const item = typeof body === "object" && body !== null ? { ...body, item_id: isdn } : body;
    if (!isItem(item)) {
      console.error("Failed to fetch ISDN item: unexpected body", body);
      return { ok: false, reason: "incomplete" };
    }
    return { ok: true, item };
  } catch (error) {
    console.error("Failed to fetch ISDN item:", error);
    return { ok: false, reason: "offline" };
  }
};

/** isdn.jp の情報を Worker の中継 API で取得する。失敗は理由を問わず `null` にする。 */
export const fetchIsdnItem = async (isdn: string): Promise<Item | null> => {
  const result = await fetchIsdnResult(isdn);
  return result.ok ? result.item : null;
};
