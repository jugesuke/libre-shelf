import type { createRoute, RouteHandler } from "@hono/zod-openapi";
import { errorSchema } from "@libre-worker/error/error";
import type { Bindings } from "../bindings";

// 入力の検証に失敗したときは、server.ts の defaultHook が各ハンドラーより先に 422 を返す。
// ルートの定義に書かなくても返るので、ドキュメントに載るようにここで足す。
const validationErrorResponse = {
  description: "リクエストの形式が不正です。",
  content: { "application/json": { schema: errorSchema } },
};

const hasValidation = (route: ReturnType<typeof createRoute>) => {
  const request = route.request;
  return (
    request !== undefined &&
    (request.params !== undefined ||
      request.query !== undefined ||
      request.body !== undefined ||
      request.headers !== undefined ||
      request.cookies !== undefined)
  );
};

/**
 * ルートの定義とハンドラーを組にして、`OpenAPIHono#openapi` に渡せる形で返す。
 * 入力を検証するルートには、`422` の応答をドキュメントに足す。
 */
export function createHandler<T extends ReturnType<typeof createRoute>>(
  route: T,
  handler: RouteHandler<T, Bindings>,
) {
  const documentedRoute: T =
    hasValidation(route) && !("422" in route.responses)
      ? { ...route, responses: { ...route.responses, 422: validationErrorResponse } }
      : route;
  return [documentedRoute, handler] as const;
}
