import type { Tema } from '../hooks/useTema';

interface BotaoTemaProps {
  tema: Tema;
  onAlternar: () => void;
}

/**
 * O rotulo diz o que o clique faz, nao o estado atual. Um botao chamado
 * "Tema escuro" enquanto a tela ja esta escura confunde leitor de tela.
 */
export function BotaoTema({ tema, onAlternar }: BotaoTemaProps) {
  const escuroAgora =
    tema === 'escuro' ||
    (tema === 'sistema' && (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false));

  return (
    <button type="button" className="botao-tema" onClick={onAlternar}>
      {escuroAgora ? 'Usar tema claro' : 'Usar tema escuro'}
    </button>
  );
}
