import type { PresetDef } from '@/lib/presets';
import type { PresetContent, PresetCommon } from '@/lib/preset-demo-dict';
import type { LayoutProps } from './layouts/_shared';
import { LaunchLayout } from './layouts/launch';
import { RoastLayout } from './layouts/roast';
import { ArenaLayout } from './layouts/arena';
import { StudioLayout } from './layouts/studio';
import { MaisonLayout } from './layouts/maison';
import { PulseLayout } from './layouts/pulse';

const LAYOUTS: Record<string, (p: LayoutProps) => React.ReactElement> = {
  launch: LaunchLayout,
  roast: RoastLayout,
  arena: ArenaLayout,
  studio: StudioLayout,
  maison: MaisonLayout,
  pulse: PulseLayout,
};

/**
 * Bespoke, per-preset demo landings. Each slug renders its own layout
 * (composition, imagery and section order matched to its mockup). Themes give
 * each page its palette / font / motion; every control is a link (no forms).
 */
export function PresetLanding({
  def, c, common, label,
}: { def: PresetDef; c: PresetContent; common: PresetCommon; label: string }) {
  const Layout = LAYOUTS[def.slug] ?? RoastLayout;
  return <Layout def={def} c={c} common={common} label={label} />;
}
