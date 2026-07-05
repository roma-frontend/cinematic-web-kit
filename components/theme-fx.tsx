/**
 * Decorative background layer that picks up the active theme's --primary.
 * Two slowly drifting radial glows + a faint film grain give premium depth on
 * any theme, with zero JS (pure CSS animation). Sits fixed behind all content.
 */
export function ThemeFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="theme-fx-glow theme-fx-glow-a" />
      <div className="theme-fx-glow theme-fx-glow-b" />
      <div className="theme-fx-grain" />
    </div>
  );
}
