/**
 * Validação de registros lidos do Local Storage (R-03).
 * Dados armazenados podem estar corrompidos ou ter sido editados manualmente,
 * então cada registro é verificado antes de entrar no domínio.
 */
import { CICLOS_POR_SESSAO, LIMITES } from '../dominio/constantes';
import type { FasePomodoro, Preset, SessaoAtiva, SnapshotPreset, StatusSessao, Tarefa } from '../dominio/tipos';
import { ESTADOS_TAREFA, PRIORIDADES_TAREFA } from '../dominio/validacao';

type Registro = Record<string, unknown>;

function ehRegistro(valor: unknown): valor is Registro {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function ehTexto(valor: unknown, min: number, max: number): valor is string {
  return typeof valor === 'string' && [...valor].length >= min && [...valor].length <= max;
}

function ehInteiroNoIntervalo(valor: unknown, faixa: { min: number; max: number }): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= faixa.min && valor <= faixa.max;
}

function ehTimestamp(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
}

function ehPertencente<T extends string>(valor: unknown, opcoes: readonly T[]): valor is T {
  return typeof valor === 'string' && (opcoes as readonly string[]).includes(valor);
}

function ehId(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0 && valor.length <= 100;
}

function ehParametrosPreset(r: Registro): r is Registro & SnapshotPreset {
  return (
    ehTexto(r.nome, LIMITES.nome.min, LIMITES.nome.max) &&
    ehInteiroNoIntervalo(r.tempoFocoMin, LIMITES.tempoFocoMin) &&
    ehInteiroNoIntervalo(r.tempoPausaCurtaMin, LIMITES.tempoPausaCurtaMin) &&
    ehInteiroNoIntervalo(r.ciclosAntesPausaLonga, LIMITES.ciclosAntesPausaLonga) &&
    ehInteiroNoIntervalo(r.tempoPausaLongaMin, LIMITES.tempoPausaLongaMin)
  );
}

/** Retorna o preset se o registro for válido, ou `null` caso contrário. */
export function validarPresetPersistido(valor: unknown): Preset | null {
  if (!ehRegistro(valor) || !ehId(valor.id) || !ehParametrosPreset(valor)) return null;
  if (!ehTimestamp(valor.criadoEm) || !ehTimestamp(valor.atualizadoEm)) return null;
  return {
    id: valor.id,
    nome: valor.nome,
    tempoFocoMin: valor.tempoFocoMin,
    tempoPausaCurtaMin: valor.tempoPausaCurtaMin,
    ciclosAntesPausaLonga: valor.ciclosAntesPausaLonga,
    tempoPausaLongaMin: valor.tempoPausaLongaMin,
    criadoEm: valor.criadoEm,
    atualizadoEm: valor.atualizadoEm,
  };
}

/** Retorna a tarefa se o registro for válido, ou `null` caso contrário. */
export function validarTarefaPersistida(valor: unknown): Tarefa | null {
  if (!ehRegistro(valor) || !ehId(valor.id)) return null;
  if (!ehTexto(valor.titulo, LIMITES.tituloTarefa.min, LIMITES.tituloTarefa.max)) return null;
  if (!ehPertencente(valor.estado, ESTADOS_TAREFA) || !ehPertencente(valor.prioridade, PRIORIDADES_TAREFA)) {
    return null;
  }
  if (!ehTimestamp(valor.criadaEm) || !ehTimestamp(valor.atualizadaEm)) return null;
  return {
    id: valor.id,
    titulo: valor.titulo,
    estado: valor.estado,
    prioridade: valor.prioridade,
    criadaEm: valor.criadaEm,
    atualizadaEm: valor.atualizadaEm,
  };
}

const FASES: readonly FasePomodoro[] = ['foco', 'pausaCurta', 'pausaLonga'];
const STATUS: readonly StatusSessao[] = ['emAndamento', 'pausada', 'concluida'];

/** Retorna a sessão se o registro for consistente, ou `null` caso contrário. */
export function validarSessaoPersistida(valor: unknown): SessaoAtiva | null {
  if (!ehRegistro(valor) || !ehId(valor.id) || !ehId(valor.presetId)) return null;
  if (!ehRegistro(valor.snapshotPreset) || !ehParametrosPreset(valor.snapshotPreset)) return null;
  const snapshot = valor.snapshotPreset;

  if (!ehPertencente(valor.faseAtual, FASES) || !ehPertencente(valor.status, STATUS)) return null;
  if (!ehInteiroNoIntervalo(valor.cicloAtual, { min: 1, max: CICLOS_POR_SESSAO })) return null;
  if (!ehTimestamp(valor.inicioFaseEm) || !ehTimestamp(valor.fimFasePrevistoEm)) return null;
  if (!ehTimestamp(valor.criadaEm) || !ehTimestamp(valor.atualizadaEm)) return null;

  let pausadaEm: number | null = null;
  let tempoRestanteAoPausarMs: number | null = null;
  if (valor.status === 'pausada') {
    // RN-06: sessão pausada precisa do tempo restante preservado.
    if (!ehTimestamp(valor.pausadaEm) || !ehTimestamp(valor.tempoRestanteAoPausarMs)) return null;
    pausadaEm = valor.pausadaEm;
    tempoRestanteAoPausarMs = valor.tempoRestanteAoPausarMs;
  } else if (valor.status === 'emAndamento') {
    if (valor.pausadaEm !== null && valor.pausadaEm !== undefined) return null;
  }

  return {
    id: valor.id,
    presetId: valor.presetId,
    snapshotPreset: {
      nome: snapshot.nome,
      tempoFocoMin: snapshot.tempoFocoMin,
      tempoPausaCurtaMin: snapshot.tempoPausaCurtaMin,
      ciclosAntesPausaLonga: snapshot.ciclosAntesPausaLonga,
      tempoPausaLongaMin: snapshot.tempoPausaLongaMin,
    },
    faseAtual: valor.faseAtual,
    cicloAtual: valor.cicloAtual,
    status: valor.status,
    inicioFaseEm: valor.inicioFaseEm,
    fimFasePrevistoEm: valor.fimFasePrevistoEm,
    pausadaEm,
    tempoRestanteAoPausarMs,
    criadaEm: valor.criadaEm,
    atualizadaEm: valor.atualizadaEm,
  };
}
