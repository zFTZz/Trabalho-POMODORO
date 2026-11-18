import type { EstadoTarefa, FasePomodoro, PrioridadeTarefa } from './tipos';

/**
 * Quantidade de ciclos (foco + pausa) que compõem uma sessão completa.
 * O documento exige um status "concluida" (RN-08) mas não define um
 * número de ciclos; adotamos 4 ciclos (o "set" clássico da técnica).
 * Ver README - "Decisões técnicas".
 */
export const CICLOS_POR_SESSAO = 4;

/** Limites de validação (seção 7 - VR-01 a VR-06). */
export const LIMITES = {
  nome: { min: 1, max: 40 },
  tempoFocoMin: { min: 1, max: 120 },
  tempoPausaCurtaMin: { min: 1, max: 60 },
  ciclosAntesPausaLonga: { min: 1, max: 12 },
  tempoPausaLongaMin: { min: 1, max: 60 },
  tituloTarefa: { min: 1, max: 100 },
} as const;

/** Valores sugeridos ao criar um novo preset (técnica clássica). */
export const VALORES_PADRAO_PRESET = {
  tempoFocoMin: 25,
  tempoPausaCurtaMin: 5,
  ciclosAntesPausaLonga: 4,
  tempoPausaLongaMin: 15,
} as const;

/** Ordem fixa das prioridades no painel, de cima para baixo (RN-10). */
export const ORDEM_PRIORIDADE: readonly PrioridadeTarefa[] = ['alta', 'media', 'baixa'];

/** Ordem fixa dos estados no painel, após a prioridade (RN-10). */
export const ORDEM_ESTADO: readonly EstadoTarefa[] = [
  'aFazer',
  'emExecucao',
  'concluida',
  'cancelada',
  'backlog',
];

export const ROTULO_ESTADO: Readonly<Record<EstadoTarefa, string>> = {
  backlog: 'Backlog',
  aFazer: 'A fazer',
  emExecucao: 'Em execução',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const ROTULO_PRIORIDADE: Readonly<Record<PrioridadeTarefa, string>> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export const ROTULO_FASE: Readonly<Record<FasePomodoro, string>> = {
  foco: 'Foco',
  pausaCurta: 'Pausa curta',
  pausaLonga: 'Pausa longa',
};

export const MS_POR_MINUTO = 60_000;
