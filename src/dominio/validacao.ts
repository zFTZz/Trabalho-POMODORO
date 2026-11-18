import { LIMITES } from './constantes';
import type { DadosPreset, DadosTarefa, EstadoTarefa, PrioridadeTarefa } from './tipos';

/** Resultado de validação: ou os dados prontos para persistir, ou mensagens por campo. */
export type ResultadoValidacao<T> =
  | { valido: true; dados: T }
  | { valido: false; erros: Partial<Record<keyof T, string>> };

/** Valores crus vindos dos formulários (sempre texto). */
export interface EntradaPreset {
  nome: string;
  tempoFocoMin: string;
  tempoPausaCurtaMin: string;
  ciclosAntesPausaLonga: string;
  tempoPausaLongaMin: string;
}

export interface EntradaTarefa {
  titulo: string;
  estado: string;
  prioridade: string;
}

const ESTADOS_VALIDOS: readonly EstadoTarefa[] = ['backlog', 'aFazer', 'emExecucao', 'concluida', 'cancelada'];
const PRIORIDADES_VALIDAS: readonly PrioridadeTarefa[] = ['baixa', 'media', 'alta'];
const REGEX_INTEIRO = /^[+-]?\d+$/;

type Faixa = { readonly min: number; readonly max: number };

/**
 * Valida um inteiro informado como texto dentro de uma faixa.
 * Retorna a mensagem de erro ou `null` quando válido.
 */
function validarInteiro(valor: string, faixa: Faixa, unidade: string): string | null {
  const texto = valor.trim();
  if (texto === '') return 'Este campo é obrigatório.';
  if (!REGEX_INTEIRO.test(texto)) return 'Informe um número inteiro, sem casas decimais.';
  const numero = Number(texto);
  if (numero < faixa.min || numero > faixa.max) {
    return `Informe um valor entre ${faixa.min} e ${faixa.max} ${unidade}.`;
  }
  return null;
}

function validarNome(valor: string): string | null {
  const nome = valor.trim();
  if (nome === '') return 'Informe um nome para o temporizador.';
  const { min, max } = LIMITES.nome;
  if ([...nome].length < min || [...nome].length > max) {
    return `O nome deve ter entre ${min} e ${max} caracteres.`;
  }
  return null;
}

/** VR-01 a VR-05: valida um preset e devolve os dados normalizados (números e nome sem espaços extras). */
export function validarPreset(entrada: EntradaPreset): ResultadoValidacao<DadosPreset> {
  const erros: Partial<Record<keyof DadosPreset, string>> = {};

  const erroNome = validarNome(entrada.nome);
  if (erroNome) erros.nome = erroNome;

  const erroFoco = validarInteiro(entrada.tempoFocoMin, LIMITES.tempoFocoMin, 'minutos');
  if (erroFoco) erros.tempoFocoMin = erroFoco;

  const erroPausaCurta = validarInteiro(entrada.tempoPausaCurtaMin, LIMITES.tempoPausaCurtaMin, 'minutos');
  if (erroPausaCurta) erros.tempoPausaCurtaMin = erroPausaCurta;

  const erroCiclos = validarInteiro(entrada.ciclosAntesPausaLonga, LIMITES.ciclosAntesPausaLonga, 'ciclos');
  if (erroCiclos) erros.ciclosAntesPausaLonga = erroCiclos;

  const erroPausaLonga = validarInteiro(entrada.tempoPausaLongaMin, LIMITES.tempoPausaLongaMin, 'minutos');
  if (erroPausaLonga) erros.tempoPausaLongaMin = erroPausaLonga;

  if (Object.keys(erros).length > 0) return { valido: false, erros };

  return {
    valido: true,
    dados: {
      nome: entrada.nome.trim(),
      tempoFocoMin: Number(entrada.tempoFocoMin.trim()),
      tempoPausaCurtaMin: Number(entrada.tempoPausaCurtaMin.trim()),
      ciclosAntesPausaLonga: Number(entrada.ciclosAntesPausaLonga.trim()),
      tempoPausaLongaMin: Number(entrada.tempoPausaLongaMin.trim()),
    },
  };
}

/** VR-06 a VR-08: valida título, estado e prioridade de uma tarefa. */
export function validarTarefa(entrada: EntradaTarefa): ResultadoValidacao<DadosTarefa> {
  const erros: Partial<Record<keyof DadosTarefa, string>> = {};
  const titulo = entrada.titulo.trim();
  const { min, max } = LIMITES.tituloTarefa;

  if (titulo === '') {
    erros.titulo = 'Informe um título para a tarefa.';
  } else if ([...titulo].length < min || [...titulo].length > max) {
    erros.titulo = `O título deve ter entre ${min} e ${max} caracteres.`;
  }

  const estado = ESTADOS_VALIDOS.find((e) => e === entrada.estado);
  if (!estado) erros.estado = 'Selecione um estado válido.';

  const prioridade = PRIORIDADES_VALIDAS.find((p) => p === entrada.prioridade);
  if (!prioridade) erros.prioridade = 'Selecione uma prioridade válida.';

  if (Object.keys(erros).length > 0 || !estado || !prioridade) return { valido: false, erros };

  return { valido: true, dados: { titulo, estado, prioridade } };
}

export const ESTADOS_TAREFA = ESTADOS_VALIDOS;
export const PRIORIDADES_TAREFA = PRIORIDADES_VALIDAS;
