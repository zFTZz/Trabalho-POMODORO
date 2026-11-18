import { describe, expect, it } from 'vitest';
import { ordenarTarefas, VALORES_PADRAO_TAREFA } from './tarefas';
import type { EstadoTarefa, PrioridadeTarefa, Tarefa } from './tipos';

function tarefa(id: string, prioridade: PrioridadeTarefa, estado: EstadoTarefa, criadaEm = 0): Tarefa {
  return { id, titulo: id, prioridade, estado, criadaEm, atualizadaEm: criadaEm };
}

describe('ordenarTarefas (RN-10, RF-19)', () => {
  it('ordena por prioridade (alta, média, baixa) e depois por estado na ordem fixa', () => {
    const entrada = [
      tarefa('baixa-backlog', 'baixa', 'backlog'),
      tarefa('alta-cancelada', 'alta', 'cancelada'),
      tarefa('media-aFazer', 'media', 'aFazer'),
      tarefa('alta-backlog', 'alta', 'backlog'),
      tarefa('alta-aFazer', 'alta', 'aFazer'),
      tarefa('alta-emExecucao', 'alta', 'emExecucao'),
      tarefa('alta-concluida', 'alta', 'concluida'),
      tarefa('baixa-aFazer', 'baixa', 'aFazer'),
    ];
    expect(ordenarTarefas(entrada).map((t) => t.id)).toEqual([
      'alta-aFazer',
      'alta-emExecucao',
      'alta-concluida',
      'alta-cancelada',
      'alta-backlog',
      'media-aFazer',
      'baixa-aFazer',
      'baixa-backlog',
    ]);
  });

  it('desempata por data de criação (mais antigas primeiro)', () => {
    const entrada = [tarefa('nova', 'media', 'aFazer', 200), tarefa('antiga', 'media', 'aFazer', 100)];
    expect(ordenarTarefas(entrada).map((t) => t.id)).toEqual(['antiga', 'nova']);
  });

  it('não altera o array original', () => {
    const entrada = [tarefa('b', 'baixa', 'backlog'), tarefa('a', 'alta', 'aFazer')];
    const copia = [...entrada];
    ordenarTarefas(entrada);
    expect(entrada).toEqual(copia);
  });
});

describe('valores padrão (RN-12)', () => {
  it('nova tarefa assume backlog e prioridade média', () => {
    expect(VALORES_PADRAO_TAREFA.estado).toBe('backlog');
    expect(VALORES_PADRAO_TAREFA.prioridade).toBe('media');
  });
});
