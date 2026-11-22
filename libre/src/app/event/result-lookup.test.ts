import { describe, expect, it } from "vitest";
import { lookupResult } from "./result-lookup";

const KEY = "event_session_history";

const storageOf = (value: unknown) => ({
  getItem: (key: string) => (key === KEY && value !== undefined ? JSON.stringify(value) : null),
  setItem: () => {},
});

const record = (id: string, schemaVersion: string) => ({
  id,
  savedAt: "2026-11-21T01:00:00.000Z",
  session: { eventName: "コミケ", eventDate: "2026-11-21", schemaVersion },
});

describe("lookupResult", () => {
  it("id が履歴にあり、スキーマが今のものなら、その要素を返すこと", () => {
    const r = lookupResult(storageOf([record("a", "2026-11-21"), record("b", "2026-11-21")]), "b");
    expect(r.kind).toBe("found");
    if (r.kind === "found") expect(r.record.id).toBe("b");
  });

  it("id が履歴にないなら not_found を返すこと", () => {
    expect(lookupResult(storageOf([record("a", "2026-11-21")]), "x")).toEqual({
      kind: "not_found",
    });
  });

  it("履歴の値が読めないときも、履歴にないものとして not_found を返すこと", () => {
    expect(lookupResult(storageOf({ not: "array" }), "a")).toEqual({ kind: "not_found" });
  });

  it("スキーマが今のものと違うなら、そのバージョンを添えて unsupported を返すこと", () => {
    const r = lookupResult(storageOf([record("a", "2026-11-15")]), "a");
    expect(r).toMatchObject({ kind: "unsupported", schemaVersion: "2026-11-15" });
  });
});
