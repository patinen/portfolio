export const clampCarouselIndex = (index: number, count: number) =>
  Math.max(0, Math.min(index, Math.max(0, count - 1)));
export const carouselKeyDelta = (key: string) =>
  key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
export const swipeDelta = (x: number, y: number) =>
  Math.abs(x) >= 50 && Math.abs(x) > Math.abs(y) * 1.5 ? (x < 0 ? 1 : -1) : 0;
