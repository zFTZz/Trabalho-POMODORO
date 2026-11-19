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

/**
 * Obtém o Local Storage do navegador sem deixar o app quebrar quando o acesso
 * à propriedade é bloqueado (política corporativa, storage desativado).
 * As operações passam a falhar com `ErroPersistencia`, que a interface reporta
 * (RNF-06), em vez de derrubar a renderização.
 */
export function criarArmazenamentoDoNavegador(): Armazenamento {
  try {
    return criarArmazenamentoLocal(window.localStorage);
  } catch {
    const falhar = (): never => {
      throw new ErroPersistencia(
        'O armazenamento deste navegador está bloqueado. Os dados não podem ser lidos nem salvos.',
      );
    };
    return { ler: falhar, gravar: falhar, remover: falhar };
  }
}
