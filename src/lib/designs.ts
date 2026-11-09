/**
 * Helpers for the Designs pages: level names, and which layer a component
 * belongs to so flows can be coloured like the architecture.
 */
import type { Design } from './schema';

export const LEVELS: Array<{ id: Design['level']; title: string; note: string }> = [
  { id: 'starter', title: 'Starter', note: 'Small systems with one or two hard ideas. Good first designs.' },
  { id: 'core', title: 'Core', note: 'The designs most interviews come back to.' },
  { id: 'advanced', title: 'Advanced', note: 'Extreme scale, money or optimisation. Do these after the core ones.' },
];

/** The colour tokens layers use, left to right. They borrow area colours. */
export const LAYER_COLOURS = ['--infra', '--web', '--systems', '--ai', '--data'];

/** Index of the layer holding a component, matched by name (case-insensitive, by prefix). */
export function layerIndex(d: Design, name: string): number {
  const n = name.toLowerCase();
  const i = d.layers.findIndex((l) => l.parts.some((p) => p.name.toLowerCase() === n));
  if (i >= 0) return i;
  const j = d.layers.findIndex((l) => l.parts.some((p) => n.startsWith(p.name.toLowerCase().split(' (')[0]!) || p.name.toLowerCase().startsWith(n)));
  return j >= 0 ? j : 0;
}

export function layerColour(d: Design, name: string): string {
  const i = layerIndex(d, name);
  return `var(${LAYER_COLOURS[Math.min(i, LAYER_COLOURS.length - 1)]})`;
}
