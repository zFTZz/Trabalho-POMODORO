import { useState } from 'react';
import { ROTULO_FASE } from '../dominio/constantes';
import { duracaoFaseMs, rotuloStatusSessao, tempoRestanteMs } from '../dominio/sessao';
import type { SessaoAtiva } from '../dominio/tipos';
import { formatarTempo } from '../utils';

interface TemporizadorSessaoProps {
  sessao: SessaoAtiva | null;
  agora: number;
  onAlternarPausa: () => void;
  onPular: () => void;
  onReiniciar: () => void;
  onEncerrar: () => void;
  onTestarSom: () => void;
}

/** RF-05 a RF-10, RF-14 - exibição da fase em curso e controles da sessão. */
export function TemporizadorSessao({
  sessao,
  agora,
  onAlternarPausa,
  onPular,
  onReiniciar,
  onEncerrar,
  onTestarSom,
}: TemporizadorSessaoProps) {
  if (!sessao) {
    return (
      <div className="temporizador temporizador--vazio">
        <p className="temporizador__vazio-titulo">Nenhuma sessão em andamento</p>
        <p className="temporizador__vazio-texto">
          Escolha um temporizador na lista abaixo e clique em <strong>Iniciar</strong> para começar o foco.
        </p>
        <TestarSom onTestarSom={onTestarSom} />
      </div>
    );
  }

  const restante = tempoRestanteMs(sessao, agora);
  const duracao = duracaoFaseMs(sessao.snapshotPreset, sessao.faseAtual);
  const progresso = Math.min(100, Math.max(0, ((duracao - restante) / duracao) * 100));
  const pausada = sessao.status === 'pausada';

  return (
    <div className={`temporizador temporizador--${sessao.faseAtual}${pausada ? ' temporizador--pausado' : ''}`}>
      <p className="temporizador__fase">
        {ROTULO_FASE[sessao.faseAtual]} <span className="temporizador__status">· {rotuloStatusSessao(sessao.status)}</span>
      </p>

      <div className="temporizador__tempo" role="timer" aria-label={`Tempo restante da fase: ${formatarTempo(restante)}`}>
        {formatarTempo(restante)}
      </div>

      <div
        className="progresso"
        role="progressbar"
        aria-label="Progresso da fase atual"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progresso)}
      >
        <div className="progresso__barra" style={{ width: `${progresso}%` }} />
      </div>

      <p className="temporizador__ciclo">
        Ciclo {sessao.cicloAtual} de {sessao.snapshotPreset.ciclosAntesPausaLonga} · {sessao.snapshotPreset.nome}
      </p>

      <div className="controles">
        <button type="button" className="botao botao--primario botao--grande" onClick={onAlternarPausa}>
          {pausada ? 'Retomar' : 'Pausar'}
        </button>
        <button type="button" className="botao botao--secundario" onClick={onPular}>
          Pular fase
        </button>
        <button type="button" className="botao botao--secundario" onClick={onReiniciar}>
          Reiniciar ciclos
        </button>
        <button type="button" className="botao botao--perigo-suave" onClick={onEncerrar}>
          Encerrar sessão
        </button>
      </div>

      <TestarSom onTestarSom={onTestarSom} />
    </div>
  );
}

function TestarSom({ onTestarSom }: { onTestarSom: () => void }) {
  const [feedback, setFeedback] = useState('');

  return (
    <>
      <button type="button" className="botao botao--texto" onClick={() => {
        onTestarSom();
        setFeedback('Alerta sonoro testado.');
        window.setTimeout(() => setFeedback(''), 3000);
      }}>
        Testar alerta sonoro
      </button>
      {feedback && (
        <span role="status" aria-live="polite" className="botao--texto" style={{ marginLeft: 10, fontSize: '0.9rem' }}>
          {feedback}
        </span>
      )}
    </>
  );
}
