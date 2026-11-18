import { useCallback, useEffect, useState } from 'react';

export type Tema = 'claro' | 'escuro' | 'sistema';

const CHAVE_TEMA = 'pomodoro.tema';

function temaSalvo(): Tema {
  try {
    const valor = window.localStorage.getItem(CHAVE_TEMA);
    if (valor === 'claro' || valor === 'escuro') return valor;
  } catch {
    // Storage bloqueado: o tema segue o sistema, sem quebrar o app.
  }
  return 'sistema';
}

/**
 * Tema com tres estados: claro, escuro e sistema. "Sistema" e o padrao e nao
 * grava nada, para que a primeira visita respeite a preferencia do SO.
 */
export function useTema() {
  const [tema, setTema] = useState<Tema>(temaSalvo);

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === 'sistema') raiz.removeAttribute('data-tema');
    else raiz.setAttribute('data-tema', tema);
    try {
      if (tema === 'sistema') window.localStorage.removeItem(CHAVE_TEMA);
      else window.localStorage.setItem(CHAVE_TEMA, tema);
    } catch {
      // Sem persistencia o tema continua valendo na sessao atual.
    }
  }, [tema]);

  const alternar = useCallback(() => {
    setTema((atual) => {
      if (atual === 'sistema') {
        const escuroNoSistema = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
        return escuroNoSistema ? 'claro' : 'escuro';
      }
      return atual === 'escuro' ? 'claro' : 'escuro';
    });
  }, []);

  return { tema, alternar };
}
