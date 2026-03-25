export function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ja-JP");
}

export function formatPrice(price: number) {
  return `¥${price.toLocaleString()}`;
}
