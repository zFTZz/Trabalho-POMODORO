/**
 * Repositórios: leitura e escrita tipada das três chaves persistidas.
 * A leitura é tolerante: registros inválidos são descartados e contabilizados,
 * e JSON corrompido é reportado via `problema` em vez de quebrar a aplicação.
 */
import type { Preset, SessaoAtiva, Tarefa } from '../dominio/tipos';
import { type Armazenamento, CHAVES } from './armazenamento';
import { validarPresetPersistido, validarSessaoPersistida, validarTarefaPersistida } from './validacaoPersistida';

export interface CarregamentoLista<T> {
  itens: T[];
  /** Quantidade de registros inválidos que foram ignorados. */
  descartados: number;
  /** Descrição do problema quando o conteúdo inteiro não pôde ser lido. */
  problema?: string;
}

function lerLista<T>(
  arm: Armazenamento,
  chave: string,
  validar: (valor: unknown) => T | null,
): CarregamentoLista<T> {
  let bruto: string | null;
  try {
    bruto = arm.ler(chave);
  } catch {
    return { itens: [], descartados: 0, problema: 'Não foi possível ler os dados salvos no navegador.' };
  }
  if (bruto === null) return { itens: [], descartados: 0 };

  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch {
    return { itens: [], descartados: 0, problema: 'Os dados salvos estavam corrompidos e foram ignorados.' };
  }
  if (!Array.isArray(json)) {
    return { itens: [], descartados: 0, problema: 'Os dados salvos estavam em formato inválido e foram ignorados.' };
  }

  const itens: T[] = [];
  let descartados = 0;
  for (const registro of json) {
    const valido = validar(registro);
    if (valido) itens.push(valido);
    else descartados += 1;
  }
  return { itens, descartados };
}

export function carregarPresets(arm: Armazenamento): CarregamentoLista<Preset> {
  return lerLista(arm, CHAVES.presets, validarPresetPersistido);
}

export function salvarPresets(arm: Armazenamento, presets: readonly Preset[]): void {
  arm.gravar(CHAVES.presets, JSON.stringify(presets));
}

export function carregarTarefas(arm: Armazenamento): CarregamentoLista<Tarefa> {
  return lerLista(arm, CHAVES.tarefas, validarTarefaPersistida);
}

export function salvarTarefas(arm: Armazenamento, tarefas: readonly Tarefa[]): void {
  arm.gravar(CHAVES.tarefas, JSON.stringify(tarefas));
}

export type CarregamentoSessao =
  | { tipo: 'vazia' }
  | { tipo: 'valida'; sessao: SessaoAtiva }
  /** R-03: registro existe mas está inconsistente; a UI deve oferecer descarte. */
  | { tipo: 'invalida' };

export function carregarSessao(arm: Armazenamento): CarregamentoSessao {
  const bruto = arm.ler(CHAVES.sessaoAtiva);
  if (bruto === null) return { tipo: 'vazia' };
  try {
    const sessao = validarSessaoPersistida(JSON.parse(bruto));
    return sessao ? { tipo: 'valida', sessao } : { tipo: 'invalida' };
  } catch {
    return { tipo: 'invalida' };
  }
}

export function salvarSessao(arm: Armazenamento, sessao: SessaoAtiva): void {
  arm.gravar(CHAVES.sessaoAtiva, JSON.stringify(sessao));
}

export function removerSessao(arm: Armazenamento): void {
  arm.remover(CHAVES.sessaoAtiva);
}
