import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { desbloquearAudio, tocarAlertaFim } from './audio/alerta';
import { Avisos, type Aviso } from './componentes/Avisos';
import { BannerSessao } from './componentes/BannerSessao';
import { BotaoTema } from './componentes/BotaoTema';
import { Dialogo } from './componentes/Dialogo';
import { DialogoConfirmacao, type Confirmacao } from './componentes/DialogoConfirmacao';
import { FormularioPreset } from './componentes/FormularioPreset';
import { FormularioTarefa } from './componentes/FormularioTarefa';
import { ListaPresets } from './componentes/ListaPresets';
import { PainelTarefas } from './componentes/PainelTarefas';
import { TemporizadorSessao } from './componentes/TemporizadorSessao';
import { ROTULO_FASE } from './dominio/constantes';
import { presetEmUso, tempoRestanteMs } from './dominio/sessao';
import type { DadosPreset, DadosTarefa, Preset, Tarefa } from './dominio/tipos';
import { useAvisosIniciais, type Notificar } from './hooks/notificacao';
import { usePresets } from './hooks/usePresets';
import { useSessaoAtiva } from './hooks/useSessaoAtiva';
import { useTarefas } from './hooks/useTarefas';
import { useTema } from './hooks/useTema';
import { criarArmazenamentoDoNavegador } from './persistencia';
import { formatarTempo, gerarId } from './utils';

type DialogoPreset = { modo: 'novo' } | { modo: 'editar'; preset: Preset };
type DialogoTarefa = { modo: 'novo' } | { modo: 'editar'; tarefa: Tarefa };

/** Converte problemas de leitura do Local Storage em avisos visíveis ao usuário (R-03, RNF-06). */
function avisosDeCarregamento(
  cargas: readonly { problema?: string; descartados: number }[],
): { tipo: 'erro' | 'info'; texto: string }[] {
  return cargas.flatMap((carga) => {
    const avisos: { tipo: 'erro' | 'info'; texto: string }[] = [];
    if (carga.problema) avisos.push({ tipo: 'erro', texto: carga.problema });
    if (carga.descartados > 0) {
      avisos.push({
        tipo: 'info',
        texto:
          carga.descartados === 1
            ? '1 registro inválido salvo no navegador foi ignorado.'
            : `${carga.descartados} registros inválidos salvos no navegador foram ignorados.`,
      });
    }
    return avisos;
  });
}

export default function App() {
  const arm = useMemo(() => criarArmazenamentoDoNavegador(), []);

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const notificar = useCallback<Notificar>((tipo, texto) => {
    setAvisos((atuais) => [...atuais.slice(-2), { id: gerarId(), tipo, texto }]);
  }, []);
  const fecharAviso = useCallback((id: string) => {
    setAvisos((atuais) => atuais.filter((aviso) => aviso.id !== id));
  }, []);

  const sessaoHook = useSessaoAtiva(arm, notificar);
  const { sessao, agora } = sessaoHook;
  const { tema, alternar: alternarTema } = useTema();

  const presetsHook = usePresets(arm, notificar, (id) => presetEmUso(id, sessao));
  const tarefasHook = useTarefas(arm, notificar);

  const avisosIniciais = useMemo(
    () => avisosDeCarregamento([presetsHook.carregamento, tarefasHook.carregamento]),
    [presetsHook.carregamento, tarefasHook.carregamento],
  );
  useAvisosIniciais(avisosIniciais, notificar);

  const [dialogoPreset, setDialogoPreset] = useState<DialogoPreset | null>(null);
  const [dialogoTarefa, setDialogoTarefa] = useState<DialogoTarefa | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);

  // Título da aba acompanha o cronômetro, útil quando a aba está em segundo plano.
  // Só reescreve quando o texto muda, evitando churn a cada tick (A06).
  const ultimoTitulo = useRef<string>('');
  useEffect(() => {
    const proximo = sessao
      ? `${formatarTempo(tempoRestanteMs(sessao, agora))} · ${ROTULO_FASE[sessao.faseAtual]} | Foco Pomodoro`
      : 'Foco Pomodoro';
    if (proximo !== ultimoTitulo.current) {
      ultimoTitulo.current = proximo;
      document.title = proximo;
    }
  }, [sessao, agora]);

  const executarConfirmacao = useCallback((alvo: Confirmacao) => {
    setConfirmacao(null);
    alvo.acao();
  }, []);

  const salvarPreset = (dados: DadosPreset): boolean => {
    const ok =
      dialogoPreset?.modo === 'editar'
        ? presetsHook.atualizar(dialogoPreset.preset.id, dados)
        : presetsHook.criar(dados);
    if (ok) setDialogoPreset(null);
    return ok;
  };

  const salvarTarefa = (dados: DadosTarefa): boolean => {
    const ok =
      dialogoTarefa?.modo === 'editar'
        ? tarefasHook.atualizar(dialogoTarefa.tarefa.id, dados)
        : tarefasHook.criar(dados);
    if (ok) setDialogoTarefa(null);
    return ok;
  };

  const pedirExclusaoPreset = (preset: Preset) => {
    setConfirmacao({
      titulo: 'Excluir temporizador',
      mensagem: `Tem certeza que deseja excluir o temporizador "${preset.nome}"? Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigoso: true,
      acao: () => presetsHook.excluir(preset.id),
    });
  };

  const pedirExclusaoTarefa = (tarefa: Tarefa) => {
    setConfirmacao({
      titulo: 'Excluir tarefa',
      mensagem: `Tem certeza que deseja excluir a tarefa "${tarefa.titulo}"? Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigoso: true,
      acao: () => tarefasHook.excluir(tarefa.id),
    });
  };

  const pedirReinicio = () => {
    setConfirmacao({
      titulo: 'Reiniciar ciclos',
      mensagem: 'A contagem volta ao ciclo 1 e a sessão recomeça no foco. O progresso dos ciclos já feitos não é mantido.',
      textoConfirmar: 'Reiniciar',
      acao: sessaoHook.reiniciar,
    });
  };

  const pedirEncerramento = () => {
    setConfirmacao({
      titulo: 'Encerrar sessão',
      mensagem: 'A sessão atual será encerrada e o progresso não será contabilizado. O temporizador ficará liberado para edição.',
      textoConfirmar: 'Encerrar sessão',
      perigoso: true,
      acao: () => sessaoHook.encerrar(),
    });
  };

  const pedirDescarte = () => {
    setConfirmacao({
      titulo: 'Descartar sessão retomada',
      mensagem: 'A sessão será removida sem contabilizar progresso. Esta ação não pode ser desfeita.',
      textoConfirmar: 'Descartar',
      perigoso: true,
      acao: sessaoHook.descartar,
    });
  };

  const editarPreset = (preset: Preset) => {
    if (presetEmUso(preset.id, sessao)) return; // RN-01
    setDialogoPreset({ modo: 'editar', preset });
  };

  const editarTarefa = (tarefa: Tarefa) => setDialogoTarefa({ modo: 'editar', tarefa });

  return (
    <div className="app" onPointerDownCapture={desbloquearAudio} onKeyDownCapture={desbloquearAudio}>
      <a className="link-pular" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="cabecalho">
        <div className="cabecalho__marca">
          <img
            className="cabecalho__icone"
            src="/icone-pomodoro.png"
            alt=""
            width={58}
            height={48}
          />
          <div className="cabecalho__texto">
            <h1 className="cabecalho__titulo">Foco Pomodoro</h1>
            <p className="cabecalho__subtitulo">Organize seus ciclos de estudo entre foco e pausa.</p>
          </div>
        </div>
        <div className="cabecalho__ferramentas">
          <BotaoTema tema={tema} onAlternar={alternarTema} />
        </div>
      </header>

      <Avisos avisos={avisos} onFechar={fecharAviso} />

      <main id="conteudo" className="grade">
        <section className="area-timer cartao" aria-labelledby="titulo-sessao">
          <div className="cartao__cabecalho">
            <h2 id="titulo-sessao" className="cartao__titulo">
              Sessão de foco
            </h2>
          </div>

          <BannerSessao
            origem={sessaoHook.origem}
            onDescartar={pedirDescarte}
            onOcultar={sessaoHook.ocultarOrigem}
          />

          <TemporizadorSessao
            sessao={sessao}
            agora={agora}
            onAlternarPausa={sessaoHook.alternarPausa}
            onPular={sessaoHook.pular}
            onReiniciar={pedirReinicio}
            onEncerrar={pedirEncerramento}
            onTestarSom={() => {
              desbloquearAudio();
              tocarAlertaFim();
            }}
          />
        </section>

        <aside className="area-tarefas" aria-label="Painel de tarefas">
          <PainelTarefas
            tarefas={tarefasHook.tarefas}
            onNova={() => setDialogoTarefa({ modo: 'novo' })}
            onEditar={editarTarefa}
            onExcluir={pedirExclusaoTarefa}
          />
        </aside>

        <div className="area-presets">
          <ListaPresets
            presets={presetsHook.presets}
            sessao={sessao}
            onNovo={() => setDialogoPreset({ modo: 'novo' })}
            onIniciar={sessaoHook.iniciar}
            onEditar={editarPreset}
            onExcluir={pedirExclusaoPreset}
          />
        </div>
      </main>

      <Dialogo
        id="dialogo-preset"
        titulo={dialogoPreset?.modo === 'editar' ? 'Editar temporizador' : 'Novo temporizador'}
        aberto={dialogoPreset !== null}
        onFechar={() => setDialogoPreset(null)}
      >
        <FormularioPreset
          presetEditando={dialogoPreset?.modo === 'editar' ? dialogoPreset.preset : null}
          onSalvar={salvarPreset}
          onCancelar={() => setDialogoPreset(null)}
        />
      </Dialogo>

      <Dialogo
        id="dialogo-tarefa"
        titulo={dialogoTarefa?.modo === 'editar' ? 'Editar tarefa' : 'Nova tarefa'}
        aberto={dialogoTarefa !== null}
        onFechar={() => setDialogoTarefa(null)}
      >
        <FormularioTarefa
          tarefaEditando={dialogoTarefa?.modo === 'editar' ? dialogoTarefa.tarefa : null}
          onSalvar={salvarTarefa}
          onCancelar={() => setDialogoTarefa(null)}
        />
      </Dialogo>

      <DialogoConfirmacao
        confirmacao={confirmacao}
        onCancelar={() => setConfirmacao(null)}
        onConfirmar={executarConfirmacao}
      />
    </div>
  );
}
