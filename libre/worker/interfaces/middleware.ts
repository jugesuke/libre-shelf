import { createMiddleware } from "hono/factory";
import { envSchema, type Bindings } from "@libre-worker/interfaces/bindings";
import { logger } from "hono/logger";

export { logger };

export const envValidation = createMiddleware<Bindings>(async (c, next) => {
  const validatedEnv = envSchema.safeParse(c.env);
  if (!validatedEnv.success) {
    return c.json(
      { error: "Configuration Error", details: validatedEnv.error },
      500,
    );
  }
  return await next();
});
