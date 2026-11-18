import { useEffect, useState } from 'react';

/**
 * Instante atual que é atualizado periodicamente para renderizar o cronômetro.
 * O estado da sessão nunca depende deste contador: o tempo é sempre calculado
 * a partir de timestamps absolutos (RNF-03).
 */
export function useAgora(intervaloMs = 1000): number {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);

  return agora;
}
