import type { EstadoTarefa, FasePomodoro, PrioridadeTarefa } from './tipos';

/**
 * Quantidade de ciclos do preset padrão (o "set" clássico da técnica).
 * A sessão dura exatamente `ciclosAntesPausaLonga` ciclos do preset: o
 * documento não define o total, e derivar do preset mantém o parâmetro
 * significativo para toda a faixa de VR-04 (1 a 12).
 * Ver README - "Decisões técnicas".
 */
export const CICLOS_PRESET_PADRAO = 4;

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
  ciclosAntesPausaLonga: CICLOS_PRESET_PADRAO,
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
