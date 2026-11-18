import type { OrigemSessao } from '../hooks/useSessaoAtiva';

interface BannerSessaoProps {
  origem: OrigemSessao;
  onDescartar: () => void;
  onOcultar: () => void;
}

/**
 * RF-12 / RF-13 - informa que a sessão foi retomada automaticamente (ou que os
 * dados salvos estão inconsistentes) e oferece o descarte, sempre com confirmação.
 */
export function BannerSessao({ origem, onDescartar, onOcultar }: BannerSessaoProps) {
  if (origem === null) return null;

  if (origem === 'invalida') {
    return (
      <section className="banner banner--alerta" aria-label="Sessão salva inconsistente">
        <p className="banner__texto">
          Os dados da sessão salva estão inconsistentes e não puderam ser restaurados.
        </p>
        <div className="banner__acoes">
          <button type="button" className="botao botao--perigo" onClick={onDescartar}>
            Descartar dados da sessão
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="banner banner--info" aria-label="Sessão retomada">
      <p className="banner__texto">
        Sessão retomada automaticamente. O tempo decorrido com o navegador fechado foi recalculado a partir das
        horas salvas.
      </p>
      <div className="banner__acoes">
        <button type="button" className="botao botao--perigo-suave" onClick={onDescartar}>
          Descartar sessão
        </button>
        <button type="button" className="botao botao--texto" onClick={onOcultar}>
          Entendi
        </button>
      </div>
    </section>
  );
}
