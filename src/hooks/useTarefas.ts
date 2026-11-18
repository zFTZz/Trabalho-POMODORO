import { useCallback, useState } from 'react';
import type { DadosTarefa, Tarefa } from '../dominio/tipos';
import { type Armazenamento, carregarTarefas, salvarTarefas } from '../persistencia';
import { gerarId, mensagemDeErro } from '../utils';
import type { Notificar } from './notificacao';

/**
 * Gerencia as tarefas do painel lateral (RF-15 a RF-17).
 * Tarefas são desacopladas do temporizador (RN-09): este hook não toca na sessão.
 */
export function useTarefas(arm: Armazenamento, notificar: Notificar) {
  const [carregamento] = useState(() => carregarTarefas(arm));
  const [tarefas, setTarefas] = useState<Tarefa[]>(carregamento.itens);

  const persistir = useCallback(
    (lista: Tarefa[]): boolean => {
      try {
        salvarTarefas(arm, lista);
        setTarefas(lista);
        return true;
      } catch (erro) {
        notificar('erro', mensagemDeErro(erro));
        return false;
      }
    },
    [arm, notificar],
  );

  const criar = useCallback(
    (dados: DadosTarefa): boolean => {
      const agora = Date.now();
      const nova: Tarefa = { ...dados, id: gerarId(), criadaEm: agora, atualizadaEm: agora };
      const ok = persistir([...tarefas, nova]);
      if (ok) notificar('sucesso', 'Tarefa criada.');
      return ok;
    },
    [persistir, tarefas, notificar],
  );

  const atualizar = useCallback(
    (id: string, dados: DadosTarefa): boolean => {
      const lista = tarefas.map((t) => (t.id === id ? { ...t, ...dados, atualizadaEm: Date.now() } : t));
      const ok = persistir(lista);
      if (ok) notificar('sucesso', 'Tarefa atualizada.');
      return ok;
    },
    [persistir, tarefas, notificar],
  );

  const excluir = useCallback(
    (id: string): boolean => {
      const ok = persistir(tarefas.filter((t) => t.id !== id));
      if (ok) notificar('sucesso', 'Tarefa excluída.');
      return ok;
    },
    [persistir, tarefas, notificar],
  );

  return { tarefas, criar, atualizar, excluir, carregamento };
}
