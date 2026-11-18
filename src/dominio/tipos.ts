/**
 * Tipos do domínio (modelo conceitual do documento de requisitos, seção 11).
 * Timestamps são números em milissegundos desde a época Unix (Date.now()).
 */

export type FasePomodoro = 'foco' | 'pausaCurta' | 'pausaLonga';

export type StatusSessao = 'emAndamento' | 'pausada' | 'concluida';

export type EstadoTarefa = 'backlog' | 'aFazer' | 'emExecucao' | 'concluida' | 'cancelada';

export type PrioridadeTarefa = 'baixa' | 'media' | 'alta';

/** RF-01 / seção 11.1 - temporizador personalizado (preset). */
export interface Preset {
  id: string;
  nome: string;
  tempoFocoMin: number;
  tempoPausaCurtaMin: number;
  ciclosAntesPausaLonga: number;
  tempoPausaLongaMin: number;
  criadoEm: number;
  atualizadoEm: number;
}

/** Campos editáveis de um preset (entrada validada). */
export type DadosPreset = Pick<
  Preset,
  'nome' | 'tempoFocoMin' | 'tempoPausaCurtaMin' | 'ciclosAntesPausaLonga' | 'tempoPausaLongaMin'
>;

/** RN-05 - cópia dos parâmetros do preset no início da sessão. */
export type SnapshotPreset = DadosPreset;

/** Seção 11.2 - sessão ativa. */
export interface SessaoAtiva {
  id: string;
  presetId: string;
  snapshotPreset: SnapshotPreset;
  faseAtual: FasePomodoro;
  cicloAtual: number;
  status: StatusSessao;
  inicioFaseEm: number;
  fimFasePrevistoEm: number;
  pausadaEm: number | null;
  tempoRestanteAoPausarMs: number | null;
  criadaEm: number;
  atualizadaEm: number;
}

/** RF-15 / seção 11.3 - tarefa do painel lateral. */
export interface Tarefa {
  id: string;
  titulo: string;
  estado: EstadoTarefa;
  prioridade: PrioridadeTarefa;
  criadaEm: number;
  atualizadaEm: number;
}

/** Campos editáveis de uma tarefa (entrada validada). */
export type DadosTarefa = Pick<Tarefa, 'titulo' | 'estado' | 'prioridade'>;
