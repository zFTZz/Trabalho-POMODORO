import { Dialogo } from './Dialogo';

export interface Confirmacao {
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  perigoso?: boolean;
  acao: () => void;
}

interface DialogoConfirmacaoProps {
  confirmacao: Confirmacao | null;
  onCancelar: () => void;
  onConfirmar: (confirmacao: Confirmacao) => void;
}

/** RF-20 / RN-11 - confirmação explícita obrigatória para exclusões e operações destrutivas. */
export function DialogoConfirmacao({ confirmacao, onCancelar, onConfirmar }: DialogoConfirmacaoProps) {
  return (
    <Dialogo id="dialogo-confirmacao" titulo={confirmacao?.titulo ?? 'Confirmar ação'} aberto={confirmacao !== null} onFechar={onCancelar}>
      {confirmacao && (
        <>
          <p className="dialogo__texto">{confirmacao.mensagem}</p>
          <div className="dialogo__acoes">
            <button type="button" className="botao botao--secundario" onClick={onCancelar}>
              Cancelar
            </button>
            <button
              type="button"
              className={`botao ${confirmacao.perigoso ? 'botao--perigo' : 'botao--primario'}`}
              onClick={() => onConfirmar(confirmacao)}
            >
              {confirmacao.textoConfirmar}
            </button>
          </div>
        </>
      )}
    </Dialogo>
  );
}
