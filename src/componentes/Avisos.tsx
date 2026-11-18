import { useEffect } from 'react';
import type { TipoAviso } from '../hooks/notificacao';

export interface Aviso {
  id: string;
  tipo: TipoAviso;
  texto: string;
}

interface AvisosProps {
  avisos: readonly Aviso[];
  onFechar: (id: string) => void;
}

/** Erros e transicoes ficam ate serem lidos; so o informativo curto expira. */
const DURACAO_AVISO_MS = 8000;

const ROTULO_TIPO: Record<TipoAviso, string> = {
  sucesso: 'Feito',
  erro: 'Erro',
  info: 'Aviso',
};

/**
 * Lista de mensagens da aplicacao. O anuncio para leitor de tela fica numa
 * regiao viva unica, fora desta lista, para nao nascer com texto dentro.
 */
export function Avisos({ avisos, onFechar }: AvisosProps) {
  return (
    <div className="avisos" aria-live="polite" aria-relevant="additions">
      {avisos.map((aviso) => (
        <AvisoItem key={aviso.id} aviso={aviso} onFechar={onFechar} />
      ))}
    </div>
  );
}

function AvisoItem({ aviso, onFechar }: { aviso: Aviso; onFechar: (id: string) => void }) {
  const expira = aviso.tipo === 'info';

  useEffect(() => {
    if (!expira) return;
    const id = window.setTimeout(() => onFechar(aviso.id), DURACAO_AVISO_MS);
    return () => window.clearTimeout(id);
  }, [aviso.id, expira, onFechar]);

  return (
    <div className={`aviso aviso--${aviso.tipo}`}>
      <span className="aviso__tipo">{ROTULO_TIPO[aviso.tipo]}</span>
      <p className="aviso__texto">{aviso.texto}</p>
      <button
        type="button"
        className="aviso__fechar"
        onClick={() => onFechar(aviso.id)}
        aria-label={`Fechar aviso: ${aviso.texto}`}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
