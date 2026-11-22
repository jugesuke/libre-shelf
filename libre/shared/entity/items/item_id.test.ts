import { describe, it, expect, vi, afterEach } from "vitest";
import {
  generateItemId,
  composeItemID,
  pickRandomID,
  modulus10CheckDigit,
  validateItemID,
  isISDN,
} from "./item_id";

describe("ItemID Generator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("modulus10CheckDigit", () => {
    it("サンプルID（2784702901978）のチェックディジット計算が正しいこと", () => {
      // 278470290197 -> チェックディジットは 8
      const digits = [2, 7, 8, 4, 7, 0, 2, 9, 0, 1, 9, 7];
      const result = modulus10CheckDigit(digits);
      expect(result).toBe(8);
    });

    it("271プレフィックスの計算例（271000000000 -> 6）", () => {
      const digits = [2, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const result = modulus10CheckDigit(digits);
      expect(result).toBe(6);
    });

    it("計算結果が10の倍数になる場合、0を返すこと", () => {
      // 合計が10の倍数になる適当な配列（例: 271000000002 -> check 0）
      const digits = [2, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2];
      const result = modulus10CheckDigit(digits);
      expect(result).toBe(0);
    });
  });

  describe("pickRandomID", () => {
    it("9桁のランダムな数値配列を生成すること", () => {
      const length = 9;
      const result = pickRandomID(length);
      expect(result).toHaveLength(length);
      result.forEach((num) => {
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThanOrEqual(9);
      });
    });
  });

  describe("composeItemID", () => {
    it("278プレフィックスとランダム部を正しく結合し、チェックディジットを付与すること", () => {
      const prefix: [number, number, number] = [2, 7, 8];
      const randomDigits = [4, 7, 0, 2, 9, 0, 1, 9, 7]; // サンプルIDのランダム部
      const result = composeItemID(prefix, randomDigits);

      expect(result).toBe("2784702901978");
    });

    it("271プレフィックスでの結合を確認すること", () => {
      const prefix: [number, number, number] = [2, 7, 1];
      const randomDigits = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const result = composeItemID(prefix, randomDigits);

      expect(result).toBe("2710000000006");
    });
  });

  describe("generateItemId", () => {
    it("生成されたIDが13桁であり、271で始まること", () => {
      const id = generateItemId();
      expect(id).toHaveLength(13);
      const validPrefix = id.startsWith("271");
      expect(validPrefix).toBe(true);
    });
  });

  describe("validateItemID", () => {
    it("サンプルID（2784702901978）を有効と判定すること", () => {
      expect(validateItemID("2784702901978")).toBe(true);
    });

    it("存在するISDNを有効と判定すること: 2784882516016 (みちくさ Vol)", () => {
      expect(validateItemID("2784882516016")).toBe(true);
    });

    it("存在するISDNを有効と判定すること: 2784882516023 (まちあるき最高の瞬間)", () => {
      expect(validateItemID("2784882516023")).toBe(true);
    });

    it("存在するISDNを有効と判定すること: 2784867874018 (ItG Vol.1)", () => {
      expect(validateItemID("2784867874018")).toBe(true);
    });

    it("存在するISDNを有効と判定すること: 2784565668025 (同人活動の手引書)", () => {
      expect(validateItemID("2784565668025")).toBe(true);
    });

    it("存在するISDNを有効と判定すること: 2784880859054 (イロイロアンドロイド)", () => {
      expect(validateItemID("2784880859054")).toBe(true);
    });

    it("271から始まるインストアコードを許可すること", () => {
      expect(validateItemID("2710000000006")).toBe(true);
    });

    it("278から始まるISDNを許可すること", () => {
      expect(validateItemID("2780000000009")).toBe(true);
    });

    it("279から始まるISDNを許可すること", () => {
      expect(validateItemID("2790000000008")).toBe(true);
    });

    it("チェックディジットが計算と一致しない場合は拒否すること", () => {
      expect(validateItemID("2784702901970")).toBe(false);
    });

    it("プレフィックスが271/278以外（例: 490）の場合は拒否すること", () => {
      // JANとしては正しいがシステム仕様外
      expect(validateItemID("4901234567894")).toBe(false);
    });

    it("13桁ではない、または数値以外の文字列を拒否すること", () => {
      expect(validateItemID("278470290197")).toBe(false); // 12桁
      expect(validateItemID("27847029019781")).toBe(false); // 14桁
      expect(validateItemID("278470290197A")).toBe(false); // 非数値
    });
  });

  describe("isISDN", () => {
    it("278で始まるIDをISDNとして有効と判定すること", () => {
      expect(isISDN("2780000000009")).toBe(true);
    });

    it("279で始まるIDをISDNとして有効と判定すること", () => {
      expect(isISDN("2790000000008")).toBe(true);
    });

    it("271で始まるIDはインストアコードなので無効と判定すること", () => {
      expect(isISDN("2710000000006")).toBe(false);
    });

    it("存在するISDNを有効と判定すること: 2784882516016 (みちくさ Vol)", () => {
      expect(isISDN("2784882516016")).toBe(true);
    });

    it("存在するISDNを有効と判定すること: 2784882516023 (まちあるき最高の瞬間)", () => {
      expect(isISDN("2784882516023")).toBe(true);
    });

    it("存在するISDNを有効と判定すること: 2784867874018 (ItG Vol.1)", () => {
      expect(isISDN("2784867874018")).toBe(true);
    });

    it("存在するISDNを有効と判定すること: 2784565668025 (同人活動の手引書)", () => {
      expect(isISDN("2784565668025")).toBe(true);
    });

    it("存在するISDNを有効と判定すること: 2784880859054 (イロイロアンドロイド)", () => {
      expect(isISDN("2784880859054")).toBe(true);
    });

    it("プレフィックスが278/279以外のIDをISDNとして無効と判定すること", () => {
      expect(isISDN("4901234567894")).toBe(false);
    });

    it("無効な長さのIDをISDNとして無効と判定すること", () => {
      expect(isISDN("27800000000")).toBe(false); // 12桁
      expect(isISDN("27800000000000")).toBe(false); // 14桁
    });

    it("非数値のIDをISDNとして無効と判定すること", () => {
      expect(isISDN("27800000000A")).toBe(false);
    });
  });
});
