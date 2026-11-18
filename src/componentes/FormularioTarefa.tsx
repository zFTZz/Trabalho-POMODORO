import { type FormEvent, useId, useRef, useState } from 'react';
import { ORDEM_ESTADO, ORDEM_PRIORIDADE, ROTULO_ESTADO, ROTULO_PRIORIDADE, LIMITES } from '../dominio/constantes';
import { VALORES_PADRAO_TAREFA } from '../dominio/tarefas';
import type { DadosTarefa, Tarefa } from '../dominio/tipos';
import { type EntradaTarefa, validarTarefa } from '../dominio/validacao';
import { Campo, descricaoCampo, focarPrimeiroErro, ResumoErros } from './Campos';

interface FormularioTarefaProps {
  tarefaEditando: Tarefa | null;
  /** Retorna `true` quando os dados foram persistidos com sucesso. */
  onSalvar: (dados: DadosTarefa) => boolean;
  onCancelar: () => void;
}

type Campos = keyof EntradaTarefa;

/** Nome legível de cada campo, usado no resumo de erros. */
const NOMES_CAMPOS: Record<Campos, string> = {
  titulo: 'Título da tarefa',
  estado: 'Estado',
  prioridade: 'Prioridade',
};

/** RF-15 / RF-16 / UC12 / UC13 - formulário de criação e edição de tarefas. */
export function FormularioTarefa({ tarefaEditando, onSalvar, onCancelar }: FormularioTarefaProps) {
  const base = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [valores, setValores] = useState<EntradaTarefa>(() =>
    tarefaEditando
      ? { titulo: tarefaEditando.titulo, estado: tarefaEditando.estado, prioridade: tarefaEditando.prioridade }
      : { titulo: VALORES_PADRAO_TAREFA.titulo, estado: VALORES_PADRAO_TAREFA.estado, prioridade: VALORES_PADRAO_TAREFA.prioridade },
  );
  const [erros, setErros] = useState<Partial<Record<Campos, string>>>({});

  const idCampo = (campo: Campos) => `${base}-${campo}`;

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const resultado = validarTarefa(valores);
    if (!resultado.valido) {
      setErros(resultado.erros);
      // O foco acompanha o erro: o resumo anuncia e recebe o foco primeiro.
      window.requestAnimationFrame(() => focarPrimeiroErro(formRef.current));
      return;
    }
    setErros({});
    onSalvar(resultado.dados);
  };

  const listaErros = (Object.keys(erros) as Campos[]).map((campo) => `${NOMES_CAMPOS[campo]}: ${erros[campo]}`);

  return (
    <form ref={formRef} className="formulario" onSubmit={enviar} noValidate>
      <ResumoErros erros={listaErros} idBase={`${base}-resumo`} />

      <Campo
        id={idCampo('titulo')}
        rotulo="Título"
        dica={`De ${LIMITES.tituloTarefa.min} a ${LIMITES.tituloTarefa.max} caracteres.`}
        erro={erros.titulo}
      >
        <input
          id={idCampo('titulo')}
          type="text"
          autoComplete="off"
          value={valores.titulo}
          onChange={(e) => setValores((v) => ({ ...v, titulo: e.target.value }))}
          aria-invalid={erros.titulo ? true : undefined}
          aria-describedby={descricaoCampo(idCampo('titulo'), true, Boolean(erros.titulo))}
        />
      </Campo>

      <div className="formulario__grade">
        <Campo id={idCampo('estado')} rotulo="Estado" erro={erros.estado}>
          <select
            id={idCampo('estado')}
            value={valores.estado}
            onChange={(e) => setValores((v) => ({ ...v, estado: e.target.value }))}
            aria-invalid={erros.estado ? true : undefined}
            aria-describedby={descricaoCampo(idCampo('estado'), false, Boolean(erros.estado))}
          >
            {ORDEM_ESTADO.map((estado) => (
              <option key={estado} value={estado}>
                {ROTULO_ESTADO[estado]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id={idCampo('prioridade')} rotulo="Prioridade" erro={erros.prioridade}>
          <select
            id={idCampo('prioridade')}
            value={valores.prioridade}
            onChange={(e) => setValores((v) => ({ ...v, prioridade: e.target.value }))}
            aria-invalid={erros.prioridade ? true : undefined}
            aria-describedby={descricaoCampo(idCampo('prioridade'), false, Boolean(erros.prioridade))}
          >
            {ORDEM_PRIORIDADE.map((prioridade) => (
              <option key={prioridade} value={prioridade}>
                {ROTULO_PRIORIDADE[prioridade]}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="dialogo__acoes">
        <button type="button" className="botao botao--secundario" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--primario">
          {tarefaEditando ? 'Salvar alterações' : 'Criar tarefa'}
        </button>
      </div>
    </form>
  );
}
