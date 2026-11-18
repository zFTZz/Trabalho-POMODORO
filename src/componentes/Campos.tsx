import { type ReactNode, useRef } from 'react';

interface CampoProps {
  id: string;
  rotulo: string;
  dica?: string;
  erro?: string;
  children: ReactNode;
}

/** Agrupa rotulo, controle, dica e mensagem de erro de um campo de formulario. */
export function Campo({ id, rotulo, dica, erro, children }: CampoProps) {
  return (
    <div className={`campo${erro ? ' campo--invalido' : ''}`}>
      <label htmlFor={id} className="campo__rotulo">
        {rotulo}
      </label>
      {children}
      {dica && !erro && (
        <p id={`${id}-dica`} className="campo__dica">
          {dica}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="campo__erro">
          {erro}
        </p>
      )}
    </div>
  );
}

/** Retorna os ids de descricao (dica/erro) de um campo, para `aria-describedby`. */
export function descricaoCampo(id: string, temDica: boolean, temErro: boolean): string | undefined {
  const ids = [temErro ? `${id}-erro` : null, temDica && !temErro ? `${id}-dica` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

interface ResumoErrosProps {
  erros: readonly string[];
  idBase: string;
}

/**
 * Resumo de erros no topo do formulario. Recebe o foco quando o envio falha,
 * o que anuncia a lista e poupa a varredura campo a campo no leitor de tela.
 */
export function ResumoErros({ erros, idBase }: ResumoErrosProps) {
  const ref = useRef<HTMLDivElement>(null);

  if (erros.length === 0) return null;

  return (
    <div ref={ref} className="resumo-erros" tabIndex={-1} role="alert" id={idBase}>
      {erros.length === 1
        ? '1 campo precisa de correção antes de salvar:'
        : `${erros.length} campos precisam de correção antes de salvar:`}
      <ul>
        {erros.map((erro) => (
          <li key={erro}>{erro}</li>
        ))}
      </ul>
    </div>
  );
}

/** Foca o resumo de erros (que anuncia a lista) ou, na sua ausencia, o primeiro
 * controle invalido. Assim o leitor de tela ouve o resumo antes dos campos. */
export function focarPrimeiroErro(form: HTMLFormElement | null) {
  if (!form) return;
  const resumo = form.querySelector<HTMLElement>('.resumo-erros');
  if (resumo) {
    resumo.focus();
    return;
  }
  const invalido = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  invalido?.focus();
}
