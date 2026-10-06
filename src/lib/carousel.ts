export function clampIndex(index: number, count: number) {
  return Math.max(0, Math.min(index, Math.max(0, count - 1)));
}
