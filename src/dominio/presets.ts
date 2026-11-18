import type { Preset } from './tipos';

/** Ordem de exibição estável: criação mais antiga primeiro. */
export function ordenarPresetsPorCriacao(presets: readonly Preset[]): Preset[] {
  return [...presets].sort((a, b) => a.criadoEm - b.criadoEm || a.id.localeCompare(b.id));
}
