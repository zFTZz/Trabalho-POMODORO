import { ORDEM_ESTADO, ORDEM_PRIORIDADE, ROTULO_ESTADO, ROTULO_PRIORIDADE } from '../dominio/constantes';
import { ordenarTarefas } from '../dominio/tarefas';
import type { Tarefa } from '../dominio/tipos';

interface PainelTarefasProps {
  tarefas: readonly Tarefa[];
  onNova: () => void;
  onEditar: (tarefa: Tarefa) => void;
  onExcluir: (tarefa: Tarefa) => void;
}

/**
 * RF-15 a RF-19 / UC15 - painel lateral de tarefas.
 * A ordenação é fixa (RN-10) e não há filtros (RT-06).
 */
export function PainelTarefas({ tarefas, onNova, onEditar, onExcluir }: PainelTarefasProps) {
  const ordenadas = ordenarTarefas(tarefas);

  return (
    <section className="cartao painel-tarefas" aria-labelledby="titulo-tarefas">
      <div className="cartao__cabecalho">
        <div>
          <h2 id="titulo-tarefas" className="cartao__titulo">
            Tarefas
          </h2>
          <p className="cartao__subtitulo">
            {tarefas.length === 1 ? '1 tarefa' : `${tarefas.length} tarefas`}
          </p>
        </div>
        <button type="button" className="botao botao--primario" onClick={onNova}>
          Nova tarefa
        </button>
      </div>

      <p className="ajuda">
        Ordem: prioridade ({ORDEM_PRIORIDADE.map((p) => ROTULO_PRIORIDADE[p]).join(' → ')}) e depois estado (
        {ORDEM_ESTADO.map((e) => ROTULO_ESTADO[e]).join(', ')}).
      </p>

      {ordenadas.length === 0 ? (
        <p className="vazio">Nenhuma tarefa cadastrada. Registre aqui o que você quer estudar.</p>
      ) : (
        <ul className="tarefas">
          {ordenadas.map((tarefa) => (
            <li key={tarefa.id} className={`tarefa tarefa--${tarefa.estado}`}>
              <div className="tarefa__corpo">
                <p className="tarefa__titulo">{tarefa.titulo}</p>
                <div className="tarefa__etiquetas">
                  <span className={`etiqueta etiqueta--estado etiqueta--${tarefa.estado}`}>
                    {ROTULO_ESTADO[tarefa.estado]}
                  </span>
                  <span className={`etiqueta etiqueta--prioridade etiqueta--${tarefa.prioridade}`}>
                    Prioridade {ROTULO_PRIORIDADE[tarefa.prioridade].toLowerCase()}
                  </span>
                </div>
              </div>
              <div className="tarefa__acoes">
                <button type="button" className="botao botao--compacto botao--secundario" onClick={() => onEditar(tarefa)} aria-label={`Editar tarefa: ${tarefa.titulo}`}>
                  Editar
                </button>
                <button type="button" className="botao botao--compacto botao--perigo-suave" onClick={() => onExcluir(tarefa)} aria-label={`Excluir tarefa: ${tarefa.titulo}`}>
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
