import { useEffect, useId, useState } from 'react';

export type TipoAviso = 'info' | 'sucesso' | 'erro';

/** Função de notificação ao usuário (mensagens de sucesso, erro e transição de fase). */
export type Notificar = (tipo: TipoAviso, texto: string) => void;

/** Dispara avisos iniciais uma única vez (inclusive em StrictMode). */
export function useAvisosIniciais(avisos: readonly { tipo: TipoAviso; texto: string }[], notificar: Notificar): void {
  const [avisosPendentes] = useState(avisos);
  const [disparado, setDisparado] = useState(false);

  useEffect(() => {
    if (disparado) return;
    setDisparado(true);
    avisosPendentes.forEach((aviso) => notificar(aviso.tipo, aviso.texto));
  }, [avisosPendentes, disparado, notificar]);
}

/**
 * Regiao viva unica e permanente. O texto entra depois da montagem, dentro de um
 * rAF, porque leitores de tela ignoram conteudo que ja existe quando o no entra
 * na arvore. Sem isso, o primeiro aviso nunca e anunciado.
 */
export function useAnuncio() {
  const idBase = useId();
  const [anuncio, setAnuncio] = useState('');
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!anuncio) return;
    const id = requestAnimationFrame(() => setVersao((v) => v + 1));
    return () => cancelAnimationFrame(id);
  }, [anuncio]);

  return {
    id: `${idBase}-anuncio`,
    texto: anuncio,
    versao,
    anunciar: setAnuncio,
  };
}
