/**
 * Adaptador de persistência sobre o Local Storage (RT-02).
 * Falhas de leitura/gravação são convertidas em `ErroPersistencia`, com
 * mensagem em português, para serem reportadas ao usuário (RNF-06).
 */

/** Chaves de persistência (seção 11.4 do documento de requisitos). */
export const CHAVES = {
  presets: 'pomodoro.presets',
  tarefas: 'pomodoro.tarefas',
  sessaoAtiva: 'pomodoro.sessaoAtiva',
} as const;

export class ErroPersistencia extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroPersistencia';
  }
}

export interface Armazenamento {
  ler(chave: string): string | null;
  gravar(chave: string, valor: string): void;
  remover(chave: string): void;
}

/** Implementação sobre `window.localStorage` (ou outro `Storage`, p.ex. em testes). */
export function criarArmazenamentoLocal(storage: Storage): Armazenamento {
  return {
    ler(chave) {
      try {
        return storage.getItem(chave);
      } catch {
        throw new ErroPersistencia('Não foi possível ler os dados salvos neste navegador.');
      }
    },
    gravar(chave, valor) {
      try {
        storage.setItem(chave, valor);
      } catch {
        throw new ErroPersistencia(
          'Não foi possível salvar os dados neste navegador. O armazenamento pode estar cheio ou bloqueado.',
        );
      }
    },
    remover(chave) {
      try {
        storage.removeItem(chave);
      } catch {
        throw new ErroPersistencia('Não foi possível remover os dados salvos neste navegador.');
      }
    },
  };
}
