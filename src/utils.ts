import { ErroPersistencia } from './persistencia';

/** Formata milissegundos como MM:SS (arredondando para cima o segundo corrente). */
export function formatarTempo(ms: number): string {
  const totalSegundos = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

/** Identificador único para entidades locais. */
export function gerarId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Mensagem legível para o usuário a partir de um erro qualquer. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroPersistencia) return erro.message;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

export function pluralizar(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}
