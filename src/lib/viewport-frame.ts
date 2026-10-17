/**
 * Where the fixed app shell sits while the keyboard is open.
 * The portrait stays sized to the full screen. The shell follows the
 * visual viewport, so the prompt rides just above the keyboard.
 */
export function viewportFrame(input: {
  offsetTop: number;
  height: number;
  seenLayoutHeight: number;
}) {
  const offsetTop = Number.isFinite(input.offsetTop) ? Math.max(0, input.offsetTop) : 0;
  const height =
    Number.isFinite(input.height) && input.height > 0 ? input.height : Math.max(input.seenLayoutHeight, 1);
  const layoutHeight = Math.max(input.seenLayoutHeight, height + offsetTop);
  return {
    offsetTop,
    height,
    layoutHeight,
    keyboard: layoutHeight - height > 150,
  };
}
