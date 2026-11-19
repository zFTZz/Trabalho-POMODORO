/**
 * Regras da sessão de foco (RF-05 a RF-11, RF-12, RN-03 a RN-08).
 *
 * Todas as funções são puras: recebem o estado atual e o instante `agora`
 * (timestamp absoluto) e devolvem um novo estado. Nada depende de contadores
 * em memória, o que permite recalcular a sessão após reabertura do navegador
 * (RNF-03) e torna o comportamento testável.
 */
import { MS_POR_MINUTO } from './constantes';
import type { FasePomodoro, Preset, SessaoAtiva, SnapshotPreset, StatusSessao } from './tipos';

/** Duração, em milissegundos, de uma fase segundo o snapshot da sessão. */
export function duracaoFaseMs(snapshot: SnapshotPreset, fase: FasePomodoro): number {
  switch (fase) {
    case 'foco':
      return snapshot.tempoFocoMin * MS_POR_MINUTO;
    case 'pausaCurta':
      return snapshot.tempoPausaCurtaMin * MS_POR_MINUTO;
    case 'pausaLonga':
      return snapshot.tempoPausaLongaMin * MS_POR_MINUTO;
  }
}

/**
 * Fase de pausa que sucede o foco do ciclo informado.
 * A pausa é longa a cada `ciclosAntesPausaLonga` ciclos (RF-01).
 */
export function faseDePausaDoCiclo(snapshot: SnapshotPreset, ciclo: number): FasePomodoro {
  return ciclo % snapshot.ciclosAntesPausaLonga === 0 ? 'pausaLonga' : 'pausaCurta';
}

export interface ProximaFase {
  fase: FasePomodoro;
  ciclo: number;
  /** Verdadeiro quando não há mais fases previstas para a sessão (RN-08). */
  concluida: boolean;
}

/**
 * Transição quando o tempo da fase se esgota.
 * Uma pausa que termina completa o ciclo e incrementa a contagem.
 * A sessão dura os `ciclosAntesPausaLonga` ciclos do snapshot, terminando
 * na pausa longa do último ciclo (RN-08).
 */
export function proximaFaseAoTerminar(snapshot: SnapshotPreset, fase: FasePomodoro, ciclo: number): ProximaFase {
  if (fase === 'foco') {
    return { fase: faseDePausaDoCiclo(snapshot, ciclo), ciclo, concluida: false };
  }
  if (ciclo >= snapshot.ciclosAntesPausaLonga) {
    return { fase, ciclo, concluida: true };
  }
  return { fase: 'foco', ciclo: ciclo + 1, concluida: false };
}

/**
 * Transição manual (RF-08 / UC06). Pular uma fase NÃO altera a contagem
 * de ciclos (RN-03), por isso a fase de foco seguinte a uma pausa pulada
 * mantém o mesmo número de ciclo.
 */
export function proximaFaseAoPular(snapshot: SnapshotPreset, fase: FasePomodoro, ciclo: number): ProximaFase {
  if (fase === 'foco') {
    return { fase: faseDePausaDoCiclo(snapshot, ciclo), ciclo, concluida: false };
  }
  if (ciclo >= snapshot.ciclosAntesPausaLonga) {
    return { fase, ciclo, concluida: true };
  }
  return { fase: 'foco', ciclo, concluida: false };
}

/** Cria uma cópia independente dos parâmetros do preset (RN-05). */
function copiarSnapshot(preset: Preset): SnapshotPreset {
  return {
    nome: preset.nome,
    tempoFocoMin: preset.tempoFocoMin,
    tempoPausaCurtaMin: preset.tempoPausaCurtaMin,
    ciclosAntesPausaLonga: preset.ciclosAntesPausaLonga,
    tempoPausaLongaMin: preset.tempoPausaLongaMin,
  };
}

/** Inicia uma sessão em andamento a partir de um preset (RF-05 / UC04). */
export function criarSessao(preset: Preset, agora: number, id: string): SessaoAtiva {
  const snapshotPreset = copiarSnapshot(preset);
  return {
    id,
    presetId: preset.id,
    snapshotPreset,
    faseAtual: 'foco',
    cicloAtual: 1,
    status: 'emAndamento',
    inicioFaseEm: agora,
    fimFasePrevistoEm: agora + duracaoFaseMs(snapshotPreset, 'foco'),
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    criadaEm: agora,
    atualizadaEm: agora,
  };
}

/**
 * Posiciona a sessão em uma nova fase, preservando o status.
 * Se a sessão estiver pausada, a fase começa congelada com o tempo cheio.
 */
function posicionarFase(
  sessao: SessaoAtiva,
  fase: FasePomodoro,
  ciclo: number,
  inicioFase: number,
  agora: number,
): SessaoAtiva {
  const duracao = duracaoFaseMs(sessao.snapshotPreset, fase);
  const base: SessaoAtiva = {
    ...sessao,
    faseAtual: fase,
    cicloAtual: ciclo,
    inicioFaseEm: inicioFase,
    fimFasePrevistoEm: inicioFase + duracao,
    atualizadaEm: agora,
  };
  if (sessao.status === 'pausada') {
    return { ...base, pausadaEm: agora, tempoRestanteAoPausarMs: duracao };
  }
  return { ...base, pausadaEm: null, tempoRestanteAoPausarMs: null };
}

function concluir(sessao: SessaoAtiva, agora: number): SessaoAtiva {
  return {
    ...sessao,
    status: 'concluida',
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    atualizadaEm: agora,
  };
}

/** Tempo restante, em ms, da fase corrente (RF-06 - preservado durante a pausa). */
export function tempoRestanteMs(sessao: SessaoAtiva, agora: number): number {
  if (sessao.status === 'concluida') return 0;
  if (sessao.status === 'pausada') return sessao.tempoRestanteAoPausarMs ?? 0;
  return Math.max(0, sessao.fimFasePrevistoEm - agora);
}

/** RF-06 / UC05 - pausa a sessão preservando o tempo restante. */
export function pausarSessao(sessao: SessaoAtiva, agora: number): SessaoAtiva {
  if (sessao.status !== 'emAndamento') return sessao;
  return {
    ...sessao,
    status: 'pausada',
    pausadaEm: agora,
    tempoRestanteAoPausarMs: Math.max(0, sessao.fimFasePrevistoEm - agora),
    atualizadaEm: agora,
  };
}

/** RF-07 / UC05 - retoma a sessão recalculando o fim da fase a partir de agora. */
export function retomarSessao(sessao: SessaoAtiva, agora: number): SessaoAtiva {
  if (sessao.status !== 'pausada') return sessao;
  const restante = sessao.tempoRestanteAoPausarMs ?? duracaoFaseMs(sessao.snapshotPreset, sessao.faseAtual);
  return {
    ...sessao,
    status: 'emAndamento',
    fimFasePrevistoEm: agora + restante,
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    atualizadaEm: agora,
  };
}

/** RF-08 / UC06 - encerra a fase corrente sem contabilizá-la e avança para a próxima. */
export function pularFase(sessao: SessaoAtiva, agora: number): SessaoAtiva {
  if (sessao.status === 'concluida') return sessao;
  const proxima = proximaFaseAoPular(sessao.snapshotPreset, sessao.faseAtual, sessao.cicloAtual);
  if (proxima.concluida) return concluir(sessao, agora);
  return posicionarFase(sessao, proxima.fase, proxima.ciclo, agora, agora);
}

/** RF-09 / UC07 - zera a contagem e volta ao foco do ciclo 1, mantendo o status. */
export function reiniciarCiclos(sessao: SessaoAtiva, agora: number): SessaoAtiva {
  if (sessao.status === 'concluida') return sessao;
  return posicionarFase(sessao, 'foco', 1, agora, agora);
}

export interface ResultadoAvanco {
  sessao: SessaoAtiva;
  /** Quantidade de fases que terminaram (e tiveram seu alerta devido). */
  fasesAvancadas: number;
  /** Verdadeiro quando a sessão foi concluída por esgotamento das fases (RN-08). */
  concluida: boolean;
}

/**
 * RN-07 / UC10 - avança sequencialmente pelas fases vencidas até a fase vigente
 * ou até a conclusão da sessão. Cada fase começa exatamente quando a anterior
 * terminou (`inicioFaseEm = fimFasePrevistoEm` anterior), preservando a precisão
 * da linha do tempo mesmo que o navegador tenha ficado fechado por muito tempo.
 *
 * Sessões pausadas não avançam (RN-06).
 */
export function avancarAteAgora(sessao: SessaoAtiva, agora: number): ResultadoAvanco {
  if (sessao.status !== 'emAndamento') {
    return { sessao, fasesAvancadas: 0, concluida: false };
  }

  let atual = sessao;
  let fasesAvancadas = 0;

  while (agora >= atual.fimFasePrevistoEm) {
    const fimAnterior = atual.fimFasePrevistoEm;
    const proxima = proximaFaseAoTerminar(atual.snapshotPreset, atual.faseAtual, atual.cicloAtual);
    fasesAvancadas += 1;

    if (proxima.concluida) {
      return { sessao: concluir(atual, agora), fasesAvancadas, concluida: true };
    }
    atual = posicionarFase(atual, proxima.fase, proxima.ciclo, fimAnterior, agora);
  }

  return { sessao: fasesAvancadas > 0 ? atual : sessao, fasesAvancadas, concluida: false };
}

/** RN-01 - um preset em uso por sessão ativa não pode ser editado nem excluído. */
export function presetEmUso(presetId: string, sessao: SessaoAtiva | null): boolean {
  return sessao !== null && sessao.status !== 'concluida' && sessao.presetId === presetId;
}

export function rotuloStatusSessao(status: StatusSessao): string {
  switch (status) {
    case 'emAndamento':
      return 'Em andamento';
    case 'pausada':
      return 'Pausada';
    case 'concluida':
      return 'Concluída';
  }
}
