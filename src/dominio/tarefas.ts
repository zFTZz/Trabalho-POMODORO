import { ORDEM_ESTADO, ORDEM_PRIORIDADE } from './constantes';
import type { DadosTarefa, Tarefa } from './tipos';

/** RN-12 - valores padrão de uma tarefa recém-criada. */
export const VALORES_PADRAO_TAREFA: DadosTarefa = {
  titulo: '',
  estado: 'backlog',
  prioridade: 'media',
};

/**
 * RN-10 / RF-19 - ordenação fixa do painel:
 * prioridade (alta → média → baixa), depois estado
 * (a fazer → em execução → concluída → cancelada → backlog).
 * Empates são resolvidos pela data de criação (mais antigas primeiro).
 */
export function ordenarTarefas(tarefas: readonly Tarefa[]): Tarefa[] {
  return [...tarefas].sort(
    (a, b) =>
      ORDEM_PRIORIDADE.indexOf(a.prioridade) - ORDEM_PRIORIDADE.indexOf(b.prioridade) ||
      ORDEM_ESTADO.indexOf(a.estado) - ORDEM_ESTADO.indexOf(b.estado) ||
      a.criadaEm - b.criadaEm ||
      a.id.localeCompare(b.id),
  );
}
