export const wrapCarouselIndex = (index: number, count: number) =>
  count > 0 ? ((index % count) + count) % count : 0;

// The positive side wins an exact tie, so two projects need no duplicate cards.
export function circularCarouselOffset(
  index: number,
  active: number,
  count: number,
) {
  if (count <= 1) return 0;
  const offset = wrapCarouselIndex(index - active, count);
  return offset > count / 2 ? offset - count : offset;
}

export const carouselKeyDelta = (key: string) =>
  key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
export const swipeDelta = (x: number, y: number) =>
  Math.abs(x) >= 50 && Math.abs(x) > Math.abs(y) * 1.5 ? (x < 0 ? 1 : -1) : 0;
