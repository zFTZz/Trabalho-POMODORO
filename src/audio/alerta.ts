/**
 * Alerta sonoro de fim de fase (RF-14, RNF-10).
 *
 * Os sons são sintetizados com a Web Audio API, sem arquivos externos
 * (biblioteca de sons está fora do escopo). Navegadores bloqueiam áudio sem
 * interação prévia (R-01): o contexto é criado/retomado dentro de gestos do
 * usuário via `desbloquearAudio`, chamado a partir de eventos de ponteiro e
 * teclado na raiz da aplicação.
 */

let contexto: AudioContext | null = null;

function obterContexto(): AudioContext | null {
  if (contexto) return contexto;
  const Construtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Construtor) return null;
  try {
    contexto = new Construtor();
  } catch {
    return null;
  }
  return contexto;
}

/** Deve ser chamada a partir de um gesto do usuário (clique, toque, tecla). */
export function desbloquearAudio(): void {
  const ctx = obterContexto();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined);
  }
}

function tocarBipe(ctx: AudioContext, quando: number, duracao: number, frequencia: number): void {
  const oscilador = ctx.createOscillator();
  const ganho = ctx.createGain();
  oscilador.type = 'sine';
  oscilador.frequency.value = frequencia;
  ganho.gain.setValueAtTime(0.0001, quando);
  ganho.gain.exponentialRampToValueAtTime(0.25, quando + 0.02);
  ganho.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
  oscilador.connect(ganho);
  ganho.connect(ctx.destination);
  oscilador.start(quando);
  oscilador.stop(quando + duracao + 0.02);
}

/** Emite três bipes curtos, indicando o fim de uma fase. Silencioso se o áudio estiver indisponível. */
export function tocarAlertaFim(): void {
  const ctx = obterContexto();
  if (!ctx) return;

  const emitir = () => {
    const inicio = ctx.currentTime + 0.02;
    tocarBipe(ctx, inicio, 0.22, 880);
    tocarBipe(ctx, inicio + 0.35, 0.22, 880);
    tocarBipe(ctx, inicio + 0.7, 0.4, 1175);
  };

  if (ctx.state === 'running') {
    emitir();
  } else {
    void ctx.resume().then(emitir).catch(() => undefined);
  }
}
