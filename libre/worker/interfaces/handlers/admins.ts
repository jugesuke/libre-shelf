import { createRoute, z } from "@hono/zod-openapi";
import { createHandler } from "./handler";

const adminsHandlers = {
  statusHandler: createHandler(
    createRoute({
      method: "get",
      path: "/status",
      tags: ["Admins API"],
      summary: "サーバの状態を取得する",
      description:
        "サーバの稼働状態を取得します。起動中であれば`ok`を返します。",
      responses: {
        200: {
          description: "サーバは正常に稼働しています",
          content: {
            "application/json": {
              schema: z.object({
                status: z.string().openapi({ example: "ok" }),
              }),
            },
          },
        },
      },
    }),
    (c) => {
      return c.json({ status: "ok" }, 200);
    },
  ),
};

export default adminsHandlers;
