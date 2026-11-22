import { describe, it, expect } from "vitest";
import {
  canExportJson,
  canSaveToHistory,
  historyMessage,
  saveButtonVariant,
} from "./history-gate";

describe("canSaveToHistory", () => {
  it("在庫の確定が済んでいて（差が空）、保存していない入力がなければ押せること", () => {
    expect(canSaveToHistory({ stockDifference: [], hasUnsavedInput: false })).toBe(true);
  });

  it("在庫の確定が済んでいない（stockDifference が null）なら押せないこと", () => {
    expect(canSaveToHistory({ stockDifference: null, hasUnsavedInput: false })).toBe(false);
  });

  it("差が 1 件以上残っているなら押せないこと", () => {
    expect(
      canSaveToHistory({
        stockDifference: [{ itemId: "item-1", difference: 2 }],
        hasUnsavedInput: false,
      }),
    ).toBe(false);
  });

  it("保存していない入力があるあいだは、確定が済んでいても押せないこと", () => {
    expect(canSaveToHistory({ stockDifference: [], hasUnsavedInput: true })).toBe(false);
  });
});

describe("canExportJson", () => {
  it("保存していない入力がなければ、在庫の確定が済んでいなくても押せること", () => {
    expect(canExportJson({ hasUnsavedInput: false })).toBe(true);
  });

  it("保存していない入力があるあいだは押せないこと", () => {
    expect(canExportJson({ hasUnsavedInput: true })).toBe(false);
  });
});

describe("historyMessage", () => {
  it("在庫の確定が済んでいない（stockDifference が null）なら、確定の文言を返すこと", () => {
    expect(historyMessage({ stockDifference: null, hasUnsavedInput: false })).toBe(
      "在庫を確定してから保存してください",
    );
  });

  it("差が 1 件以上残っているなら、確定の文言を返すこと", () => {
    expect(
      historyMessage({
        stockDifference: [{ itemId: "item-1", difference: 2 }],
        hasUnsavedInput: false,
      }),
    ).toBe("在庫を確定してから保存してください");
  });

  it("確定が済んでいて保存していない入力があるなら、未保存の文言を返すこと", () => {
    expect(historyMessage({ stockDifference: [], hasUnsavedInput: true })).toBe(
      "保存していない入力があります",
    );
  });

  it("確定が済んでいて保存していない入力もないなら、文言を返さないこと", () => {
    expect(historyMessage({ stockDifference: [], hasUnsavedInput: false })).toBe(null);
  });

  it("確定が済んでいなければ、保存していない入力があっても確定の文言だけを返すこと", () => {
    expect(historyMessage({ stockDifference: null, hasUnsavedInput: true })).toBe(
      "在庫を確定してから保存してください",
    );
  });
});

describe("saveButtonVariant", () => {
  it("在庫の確定が済んでいれば primary であること", () => {
    expect(saveButtonVariant([])).toBe("primary");
  });

  it("在庫の確定が済むまでは secondary であること（「在庫を確定する」が primary のため）", () => {
    expect(saveButtonVariant(null)).toBe("secondary");
    expect(saveButtonVariant([{ itemId: "item-1", difference: 2 }])).toBe("secondary");
  });
});
