import { type ReactNode, useEffect, useRef } from 'react';

interface DialogoProps {
  id: string;
  titulo: string;
  aberto: boolean;
  onFechar: () => void;
  children: ReactNode;
}

/**
 * Dialogo modal sobre o elemento nativo <dialog>: foco preso, Esc tratado e
 * retorno do foco ao gatilho vem do proprio navegador.
 *
 * O foco inicial vai para o titulo, nao para o primeiro campo. Assim o leitor
 * de tela anuncia qual dialogo abriu antes de pedir a digitacao.
 */
export function Dialogo({ id, titulo, aberto, onFechar, children }: DialogoProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) {
      dialogo.showModal();
      tituloRef.current?.focus();
    }
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      id={id}
      className="dialogo"
      aria-labelledby={`${id}-titulo`}
      onCancel={(evento) => {
        evento.preventDefault();
        onFechar();
      }}
    >
      <div className="dialogo__conteudo">
        <h2 id={`${id}-titulo`} ref={tituloRef} className="dialogo__titulo" tabIndex={-1}>
          {titulo}
        </h2>
        {aberto ? children : null}
      </div>
    </dialog>
  );
}
