import { OpenAPIHono } from "@hono/zod-openapi";
import type { Bindings } from "@libre-worker/interfaces/bindings";
import { envValidation, logger } from "@libre-worker/interfaces/middleware";
import { Scalar } from "@scalar/hono-api-reference";
import adminsHandlers from "./handlers/admins";
import isdnHandlers from "./handlers/isdn";

const backendAppV1 = new OpenAPIHono<Bindings>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json({ error: "Invalid request", details: result.error }, 422);
    }
  },
}).basePath("/api/v1");

backendAppV1.use(logger());
backendAppV1.use(envValidation);

backendAppV1
  .doc("/docs/spec.json", (c) => {
    const requestOrigin = new URL(c.req.url).origin;

    return {
      openapi: "3.1.0",
      info: {
        title: "Libre Shelf Backend API",
        version: "1.0.0",
        description: "Libre Shelf のバックエンド API",
      },
      servers: [
        {
          url: requestOrigin,
          description: "現在のアクセス元",
        },
        {
          url: "http://localhost:5173",
          description: "ローカル開発環境",
        },
      ],
    };
  })
  .get("/docs", Scalar({ url: "/api/v1/docs/spec.json" }));

const backendAppV1Routes = backendAppV1
  // admins api
  .openapi(...adminsHandlers.statusHandler)
  // isdn api
  .openapi(...isdnHandlers.getISDNItemHandler);

export type BackendAppV1Type = typeof backendAppV1Routes;
export default backendAppV1;
