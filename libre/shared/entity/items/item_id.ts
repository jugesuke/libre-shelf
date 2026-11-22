// ItemID生成ロジック (ISDN互換)
//
// prefixによって仕様が変わる
// JAN13用のバーコードリーダーで読み取れる形式にする必要があるため，以下の仕様に準じる。
//
// prefix = 278 or 279 の場合：
// International Standard Dojin Numbering (ISDN) として扱う
// 仕様は以下．
// 例： 278-4-702901-97-8
// 概ね ISBN-13 の仕様に準じる。13桁固定長である。
// フラグは 278～279 とする。(インストアコード用 20x～29x と ISBN-13 のフラグ 978～979 の合成)
// グループ記号 1桁～5桁(可変)は ISBN に準じる。日本国内なら 4 となる。
// 出版者記号 7桁～1桁(可変)を作品記号として乱数的に発行する。
// 書名記号 2桁～1桁(可変)を作品記号として乱数的に発行する。
// 末尾はチェックデジットとして「モジュラス10 ウェイト3・1」にて計算した値である。
//
// prefix = 271 の場合：
// インストアコード．
// 例： 271-000000000-6
// 13桁固定長である。
// フラグは 271 とする。(インストアコード用 20x～29x のうち，店舗内専用コードとして予約されている範囲)
// 残りの9桁を乱数的に発行する。
// 末尾はチェックデジットとして「モジュラス10 ウェイト3・1」にて計算した値である。
// ISDNと共存できるように設計されている。

export function generateItemId(
  prefix: [number, number, number] = [2, 7, 1],
): string {
  // prefixを除いた9桁のランダムな数字を生成
  //   271  *********   *
  // |<-3->|<-- 9 -->|<-1->|
  const randomDigits = pickRandomID(13 - 3 - 1);

  return composeItemID(prefix, randomDigits);
}

// ItemIDを構成する
export function composeItemID(
  prefix: [number, number, number],
  randomDigits: number[],
): string {
  // ベースとなる数字列を作成
  const baseDigits = [...prefix, ...randomDigits];

  // チェックディジットを計算
  const checkDigit = modulus10CheckDigit(baseDigits);

  // 最終的なItemIDを組み立てる
  const isdnDigits = [...baseDigits, checkDigit];

  return isdnDigits.join("");
}

// 指定された長さのランダムな数字の配列を生成
export function pickRandomID(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 10));
}

// モジュラス10 ウェイト3・1でチェックディジットを計算
export function modulus10CheckDigit(digits: number[]): number {
  // ウェイト3・1を交互に適用して合計を計算
  // 下の桁から，偶数桁に3，奇数桁に1を掛ける
  // 例: 278470290197 -> (2*3)+(7*1)+(8*3)+(4*1)+(7*3)+(0*1)+(2*3)+(9*1)+(0*3)+(1*1)+(9*3)+ (7*1)
  //    = 6 + 7 + 24 + 4 + 21 + 0 + 6 + 9 + 0 + 1 + 27 + 7 = 112
  const sum = digits
    .slice() // 元の配列を変更しないようにコピー
    .reverse() // 下の桁から処理するために反転
    .map((digit, index) => (index % 2 === 0 ? digit * 3 : digit * 1)) // 偶数桁に3，奇数桁に1を掛ける
    .reduce((acc, val) => acc + val, 0); // 合計を計算

  // 合計のモジュラス10を計算し，チェックディジットを求める
  // チェックディジット = (10 - (sum mod 10)) mod 10
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

// ItemIDの妥当性を検証
export function validateItemID(itemID: string): boolean {
  if (itemID.length !== 13 || !/^\d{13}$/.test(itemID)) {
    return false;
  }

  const prefix = itemID.slice(0, 3);
  if (prefix !== "271" && prefix !== "278" && prefix !== "279") {
    return false;
  }

  const digits = itemID.split("").map(Number);
  const checkDigit = digits.pop()!; // 最後の数字をチェックディジットとして取り出す

  const calculatedCheckDigit = modulus10CheckDigit(digits);

  return checkDigit === calculatedCheckDigit;
}

export function isISDN(itemID: string): boolean {
  const prefix = itemID.slice(0, 3);
  // 278または279で始まる場合はISDN
  if (prefix === "278" || prefix === "279") {
    // 妥当性も確認する
    return validateItemID(itemID);
  } else {
    // それ以外はISDNではない
    return false;
  }
}
