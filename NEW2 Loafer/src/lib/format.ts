/**
 * 価格を整数でフォーマット（小数点なし、千単位カンマ区切り）
 */
export function formatPrice(price: number | string | undefined | null): string {
  if (price === undefined || price === null) return '0';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return Math.floor(num).toLocaleString('ja-JP');
}

