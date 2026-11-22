import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "@libre-worker/interfaces/server";

type Operation = {
  parameters?: unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
};
type OpenAPIDocument = { paths: Record<string, Record<string, Operation>> };

async function fetchDocument(): Promise<OpenAPIDocument> {
  const res = await app.request("/api/v1/docs/spec.json", {}, env);
  return res.json<OpenAPIDocument>();
}

function operations(doc: OpenAPIDocument) {
  return Object.entries(doc.paths).flatMap(([path, ops]) =>
    Object.entries(ops).map(([method, op]) => ({ name: `${method.toUpperCase()} ${path}`, op })),
  );
}

const validates = (op: Operation) =>
  (op.parameters?.length ?? 0) > 0 || op.requestBody !== undefined;

describe("OpenAPI のドキュメント", () => {
  // 入力の検証に失敗すると server.ts の defaultHook が 422 を返すので、ドキュメントにも載せる
  it("入力を検証する API には、すべて 422 の応答がある", async () => {
    const missing = operations(await fetchDocument())
      .filter(({ op }) => validates(op) && !("422" in op.responses))
      .map(({ name }) => name);
    expect(missing).toEqual([]);
  });

  it("入力を受け取らない API には、422 の応答がない", async () => {
    const unexpected = operations(await fetchDocument())
      .filter(({ op }) => !validates(op) && "422" in op.responses)
      .map(({ name }) => name);
    expect(unexpected).toEqual([]);
  });
});
