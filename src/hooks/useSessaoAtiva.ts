import { useCallback, useEffect, useState } from 'react';
import { tocarAlertaFim } from '../audio/alerta';
import { CICLOS_POR_SESSAO, ROTULO_FASE } from '../dominio/constantes';
import {
  avancarAteAgora,
  criarSessao,
  duracaoFaseMs,
  pausarSessao,
  pularFase,
  reiniciarCiclos,
  retomarSessao,
  type ResultadoAvanco,
} from '../dominio/sessao';
import type { Preset, SessaoAtiva } from '../dominio/tipos';
import {
  type Armazenamento,
  carregarSessao,
  removerSessao,
  salvarSessao,
} from '../persistencia';
import { gerarId, mensagemDeErro } from '../utils';
import { type Notificar, useAvisosIniciais } from './notificacao';
import { useAgora } from './useAgora';

/** Origem da sessão exibida no banner: retomada automaticamente ou com dados inconsistentes (R-03). */
export type OrigemSessao = 'retomada' | 'invalida' | null;

interface Restauracao {
  sessao: SessaoAtiva | null;
  origem: OrigemSessao;
  concluidaEnquantoFechado: boolean;
  erro: string | null;
}

/** Executa uma operação de escrita e devolve a mensagem de erro, se houver. */
function tentar(operacao: () => void): string | null {
  try {
    operacao();
    return null;
  } catch (erro) {
    return mensagemDeErro(erro);
  }
}

/**
 * RF-12 / UC10 - restaura a sessão persistida recalculando o estado pelos timestamps.
 * Executado uma única vez, na inicialização do hook.
 */
function restaurarSessao(arm: Armazenamento, agora: number): Restauracao {
  const carregado = carregarSessao(arm);
  if (carregado.tipo === 'vazia') {
    return { sessao: null, origem: null, concluidaEnquantoFechado: false, erro: null };
  }
  if (carregado.tipo === 'invalida') {
    return { sessao: null, origem: 'invalida', concluidaEnquantoFechado: false, erro: null };
  }

  const avanco = avancarAteAgora(carregado.sessao, agora);
  if (avanco.concluida) {
    // RN-08: todas as fases venceram com o navegador fechado.
    const erro = tentar(() => removerSessao(arm));
    return { sessao: null, origem: null, concluidaEnquantoFechado: true, erro };
  }
  // Mesmo que a gravação falhe, a sessão é recuperada em memória e o erro é reportado.
  const erro = avanco.fasesAvancadas > 0 ? tentar(() => salvarSessao(arm, avanco.sessao)) : null;
  return { sessao: avanco.sessao, origem: 'retomada', concluidaEnquantoFechado: false, erro };
}

function mensagemTransicao(sessao: SessaoAtiva): string {
  const duracao = Math.round(duracaoFaseMs(sessao.snapshotPreset, sessao.faseAtual) / 60_000);
  switch (sessao.faseAtual) {
    case 'foco':
      return `Pausa encerrada. Hora de focar no ciclo ${sessao.cicloAtual} de ${CICLOS_POR_SESSAO}.`;
    case 'pausaCurta':
      return `Foco concluído! Pausa curta de ${duracao} min.`;
    case 'pausaLonga':
      return `Foco concluído! Pausa longa de ${duracao} min.`;
  }
}

function gravarSessao(arm: Armazenamento, sessao: SessaoAtiva | null, notificar: Notificar): void {
  try {
    if (sessao) salvarSessao(arm, sessao);
    else removerSessao(arm);
  } catch (erro) {
    notificar('erro', mensagemDeErro(erro));
  }
}

/**
 * Controla a sessão de foco ativa: início, pausa/retomada, pular fase,
 * reiniciar ciclos, encerramento, descarte e avanço automático das fases.
 */
export function useSessaoAtiva(arm: Armazenamento, notificar: Notificar) {
  const [inicial] = useState(() => restaurarSessao(arm, Date.now()));
  const [sessao, setSessao] = useState<SessaoAtiva | null>(inicial.sessao);
  const [origem, setOrigem] = useState<OrigemSessao>(inicial.origem);

  useAvisosIniciais(
    [
      ...(inicial.concluidaEnquantoFechado
        ? [{ tipo: 'sucesso' as const, texto: 'Sua sessão foi concluída enquanto o navegador estava fechado.' }]
        : []),
      ...(inicial.erro ? [{ tipo: 'erro' as const, texto: inicial.erro }] : []),
    ],
    notificar,
  );

  /**
   * Aplica o resultado de um avanço por tempo: atualiza estado, persiste,
   * notifica a transição e emite o alerta sonoro (RF-14 / RN-13).
   */
  const aplicarAvanco = useCallback(
    (resultado: ResultadoAvanco, comSom: boolean) => {
      if (resultado.fasesAvancadas === 0) return;
      if (resultado.concluida) {
        gravarSessao(arm, null, notificar);
        setSessao(null);
        setOrigem(null);
        notificar('sucesso', `Sessão concluída! Você completou os ${CICLOS_POR_SESSAO} ciclos.`);
      } else {
        gravarSessao(arm, resultado.sessao, notificar);
        setSessao(resultado.sessao);
        notificar('info', mensagemTransicao(resultado.sessao));
      }
      if (comSom) tocarAlertaFim();
    },
    [arm, notificar],
  );

  // Verifica o vencimento da fase a cada tick. O avanço depende apenas dos
  // timestamps persistidos, nunca de contadores em memória (RNF-03).
  const agora = useAgora();
  useEffect(() => {
    if (!sessao || sessao.status !== 'emAndamento' || agora < sessao.fimFasePrevistoEm) return;
    aplicarAvanco(avancarAteAgora(sessao, agora), true);
  }, [agora, sessao, aplicarAvanco]);

  /**
   * Executa uma ação sobre a sessão. Antes da ação, aplica qualquer avanço
   * vencido para que a ação opere sobre o estado correto no tempo atual.
   */
  const atualizar = useCallback(
    (transformar: (atual: SessaoAtiva, instante: number) => SessaoAtiva, mensagem?: string) => {
      if (!sessao) return;
      const instante = Date.now();
      const base = avancarAteAgora(sessao, instante);
      aplicarAvanco(base, true);
      if (base.concluida) return;

      const nova = transformar(base.sessao, instante);
      if (nova.status === 'concluida') {
        gravarSessao(arm, null, notificar);
        setSessao(null);
        setOrigem(null);
        notificar('sucesso', `Sessão concluída! Você completou os ${CICLOS_POR_SESSAO} ciclos.`);
        return;
      }
      gravarSessao(arm, nova, notificar);
      setSessao(nova);
      if (mensagem) notificar('info', mensagem);
    },
    [arm, sessao, aplicarAvanco, notificar],
  );

  const iniciar = useCallback(
    (preset: Preset) => {
      const anterior = sessao;
      const nova = criarSessao(preset, Date.now(), gerarId());
      gravarSessao(arm, nova, notificar);
      setSessao(nova);
      setOrigem(null);
      if (anterior && anterior.presetId !== preset.id) {
        // RN-02: a sessão anterior é encerrada automaticamente, sem confirmação adicional.
        notificar('sucesso', `Sessão de "${anterior.snapshotPreset.nome}" encerrada. Iniciada "${preset.nome}".`);
      } else {
        notificar('sucesso', `Sessão iniciada com "${preset.nome}". Foco do ciclo 1.`);
      }
    },
    [arm, sessao, notificar],
  );

  const alternarPausa = useCallback(() => {
    atualizar((s, instante) => (s.status === 'pausada' ? retomarSessao(s, instante) : pausarSessao(s, instante)));
  }, [atualizar]);

  const pular = useCallback(() => {
    atualizar(
      (s, instante) => pularFase(s, instante),
      'Fase ignorada. Contagem de ciclos não alterada.',
    );
  }, [atualizar]);

  const reiniciar = useCallback(() => {
    atualizar((s, instante) => reiniciarCiclos(s, instante), 'Ciclos reiniciados. Foco do ciclo 1.');
  }, [atualizar]);

  /** UC08 / UC11 - encerra a sessão sem contabilizar progresso e libera o preset (RN-01). */
  const encerrar = useCallback(
    (mensagem = 'Sessão encerrada.') => {
      gravarSessao(arm, null, notificar);
      setSessao(null);
      setOrigem(null);
      notificar('info', mensagem);
    },
    [arm, notificar],
  );

  /** UC11 / R-03 - descarte de sessão retomada ou inconsistente. */
  const descartar = useCallback(() => {
    encerrar('Sessão descartada. Nenhum progresso foi contabilizado.');
  }, [encerrar]);

  const ocultarOrigem = useCallback(() => setOrigem(null), []);

  return {
    sessao,
    agora,
    origem,
    ocultarOrigem,
    iniciar,
    alternarPausa,
    pular,
    reiniciar,
    encerrar,
    descartar,
    rotuloFase: sessao ? ROTULO_FASE[sessao.faseAtual] : null,
  };
}
