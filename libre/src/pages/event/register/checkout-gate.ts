/**
 * 会計の確定ボタンを押せるかを返す。
 * カートに商品があり、預かった金額が合計以上のときだけ true になる。
 * 預かった金額を入力していないときは 0 を渡す。
 */
export function canCheckout({
  cartLength,
  total,
  tenderedAmount,
}: {
  cartLength: number;
  total: number;
  tenderedAmount: number;
}): boolean {
  return cartLength > 0 && tenderedAmount >= total;
}
