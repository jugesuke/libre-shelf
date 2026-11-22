import { createRoute, z } from "@hono/zod-openapi";
import { errorSchema } from "@libre-worker/error/error";
import { lookupISDNItem } from "@libre-worker/isdn/get";
import { isdnItemIDPayload, itemPayload } from "../payloads/items";
import { createHandler } from "./handler";

const isdnHandlers = {
  getISDNItemHandler: createHandler(
    createRoute({
      method: "get",
      path: "/isdn/{isdn}",
      tags: ["ISDN API"],
      summary: "ISDNから商品情報を取得する",
      description:
        "isdn.jp に登録された商品情報を取得して返します。取得した情報は保存しません。",
      request: {
        params: z.object({ isdn: isdnItemIDPayload }),
      },
      responses: {
        200: {
          description: "商品情報の取得に成功しました",
          content: { "application/json": { schema: itemPayload } },
        },
        400: {
          description: "isdn.jp の応答の形が不正です",
          content: { "application/json": { schema: errorSchema } },
        },
        404: {
          description: "isdn.jp に登録がありません",
          content: { "application/json": { schema: errorSchema } },
        },
        502: {
          description:
            "isdn.jp に接続できない、または 404 以外のエラーが返りました",
          content: { "application/json": { schema: errorSchema } },
        },
      },
    }),
    async (c) => {
      const { isdn } = c.req.valid("param");

      const result = await lookupISDNItem(isdn);
      if (!result.ok) {
        return c.json(result.errorResponse, result.statusCode);
      }

      return c.json(result.result, 200);
    },
  ),
};

export default isdnHandlers;
