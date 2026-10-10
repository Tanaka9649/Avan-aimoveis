export function floatingMenuPosition({
  rect,
  viewportWidth,
  viewportHeight,
  width,
  height,
  gap = 7,
  margin = 8,
}: {
  rect: { top: number; bottom: number; right: number };
  viewportWidth: number;
  viewportHeight: number;
  width: number;
  height: number;
  gap?: number;
  margin?: number;
}) {
  const left = Math.max(margin, Math.min(viewportWidth - width - margin, rect.right - width));
  const below = viewportHeight - rect.bottom;
  const above = rect.top;
  const openBelow = below >= Math.min(height, Math.max(0, above - margin));
  const top = openBelow
    ? Math.min(viewportHeight - height - margin, rect.bottom + gap)
    : Math.max(margin, rect.top - height - gap);
  return { top: Math.max(margin, top), left, placement: openBelow ? "bottom" as const : "top" as const };
}
