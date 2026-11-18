import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { CHAVES } from './persistencia';
import type { Preset, SessaoAtiva, Tarefa } from './dominio/tipos';

const MIN = 60_000;

const presetBase: Preset = {
  id: 'p-estudo',
  nome: 'Estudo intenso',
  tempoFocoMin: 25,
  tempoPausaCurtaMin: 5,
  ciclosAntesPausaLonga: 4,
  tempoPausaLongaMin: 15,
  criadoEm: 1,
  atualizadoEm: 1,
};

function sessaoDe(preset: Preset, overrides: Partial<SessaoAtiva>, inicio: number): SessaoAtiva {
  const parametros = {
    nome: preset.nome,
    tempoFocoMin: preset.tempoFocoMin,
    tempoPausaCurtaMin: preset.tempoPausaCurtaMin,
    ciclosAntesPausaLonga: preset.ciclosAntesPausaLonga,
    tempoPausaLongaMin: preset.tempoPausaLongaMin,
  };
  return {
    id: 's-1',
    presetId: preset.id,
    snapshotPreset: parametros,
    faseAtual: 'foco',
    cicloAtual: 1,
    status: 'emAndamento',
    inicioFaseEm: inicio,
    fimFasePrevistoEm: inicio + preset.tempoFocoMin * MIN,
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    criadaEm: inicio,
    atualizadaEm: inicio,
    ...overrides,
  };
}

function persistirPresets(presets: Preset[]) {
  localStorage.setItem(CHAVES.presets, JSON.stringify(presets));
}

function lerSessaoPersistida(): SessaoAtiva | null {
  const bruto = localStorage.getItem(CHAVES.sessaoAtiva);
  return bruto ? (JSON.parse(bruto) as SessaoAtiva) : null;
}

function obterDialogoAberto(): HTMLElement {
  const dialogo = document.querySelector('dialog[open]');
  if (!dialogo) throw new Error('Nenhum diálogo aberto');
  return dialogo as HTMLElement;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('estado inicial', () => {
  it('mostra a interface em português sem sessão ativa', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Foco Pomodoro', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Nenhuma sessão em andamento')).toBeInTheDocument();
    expect(screen.getByText(/Nenhum temporizador cadastrado/)).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Painel de tarefas' })).toBeInTheDocument();
  });
});

describe('temporizadores personalizados (UC01, UC02, UC03)', () => {
  it('rejeita dados inválidos com mensagem por campo e não persiste', async () => {
    const usuario = userEvent.setup();
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: 'Novo temporizador' }));
    const dialogo = obterDialogoAberto();
    const nome = within(dialogo).getByLabelText('Nome do temporizador');
    await usuario.clear(nome);
    await usuario.clear(within(dialogo).getByLabelText('Tempo de foco (min)'));
    await usuario.type(within(dialogo).getByLabelText('Tempo de foco (min)'), '150');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Criar temporizador' }));

    expect(within(dialogo).getByText('Informe um nome para o temporizador.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe um valor entre 1 e 120 minutos.')).toBeInTheDocument();
    expect(nome).toHaveAttribute('aria-invalid', 'true');
    expect(localStorage.getItem(CHAVES.presets)).toBeNull();
  });

  it('cria um temporizador válido e o exibe na lista', async () => {
    const usuario = userEvent.setup();
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: 'Novo temporizador' }));
    const dialogo = obterDialogoAberto();
    await usuario.type(within(dialogo).getByLabelText('Nome do temporizador'), 'Matemática');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Criar temporizador' }));

    expect(screen.getByRole('heading', { name: 'Matemática', level: 3 })).toBeInTheDocument();
    const persistidos = JSON.parse(localStorage.getItem(CHAVES.presets) ?? '[]') as Preset[];
    expect(persistidos).toHaveLength(1);
    expect(persistidos[0]).toMatchObject({ nome: 'Matemática', tempoFocoMin: 25, ciclosAntesPausaLonga: 4 });
  });

  it('cancelar não altera o estado persistido', async () => {
    const usuario = userEvent.setup();
    persistirPresets([presetBase]);
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: 'Editar' }));
    const dialogo = obterDialogoAberto();
    await usuario.clear(within(dialogo).getByLabelText('Nome do temporizador'));
    await usuario.type(within(dialogo).getByLabelText('Nome do temporizador'), 'Outro nome');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(JSON.parse(localStorage.getItem(CHAVES.presets) ?? '[]')[0].nome).toBe('Estudo intenso');
  });

  it('exclusão exige confirmação e cancelar não remove', async () => {
    const usuario = userEvent.setup();
    persistirPresets([presetBase]);
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: 'Excluir' }));
    const dialogo = obterDialogoAberto();
    expect(within(dialogo).getByText(/Tem certeza que deseja excluir o temporizador "Estudo intenso"/)).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(JSON.parse(localStorage.getItem(CHAVES.presets) ?? '[]')).toHaveLength(1);

    await usuario.click(screen.getByRole('button', { name: 'Excluir' }));
    await usuario.click(within(obterDialogoAberto()).getByRole('button', { name: 'Excluir' }));
    expect(JSON.parse(localStorage.getItem(CHAVES.presets) ?? '[]')).toHaveLength(0);
    expect(screen.getByText(/Nenhum temporizador cadastrado/)).toBeInTheDocument();
  });
});

describe('sessão de foco (UC04, UC05, RN-01, RN-05)', () => {
  it('inicia, pausa e retoma; bloqueia edição e exclusão do preset em uso', async () => {
    const usuario = userEvent.setup();
    persistirPresets([presetBase]);
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: 'Iniciar' }));
    const timer = screen.getByRole('timer');
    expect(timer.textContent).toMatch(/^2[45]:\d{2}$/);
    expect(screen.getByText(/Foco/, { selector: '.temporizador__fase' })).toBeInTheDocument();
    expect(lerSessaoPersistida()?.status).toBe('emAndamento');

    // RN-01: preset em uso
    expect(screen.getByRole('button', { name: 'Editar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled();
    expect(screen.getByText(/Em uso pela sessão ativa/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(screen.getByRole('button', { name: 'Retomar' })).toBeInTheDocument();
    expect(lerSessaoPersistida()?.status).toBe('pausada');
    expect(lerSessaoPersistida()?.tempoRestanteAoPausarMs).toBeGreaterThan(24 * MIN);

    await usuario.click(screen.getByRole('button', { name: 'Retomar' }));
    expect(lerSessaoPersistida()?.status).toBe('emAndamento');
  });

  it('pular fase de foco vai para a pausa curta sem alterar o ciclo', async () => {
    const usuario = userEvent.setup();
    persistirPresets([presetBase]);
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: 'Iniciar' }));
    await usuario.click(screen.getByRole('button', { name: 'Pular fase' }));
    expect(screen.getByText(/Pausa curta/, { selector: '.temporizador__fase' })).toBeInTheDocument();
    expect(screen.getByText(/Ciclo 1 de 4/)).toBeInTheDocument();
  });

  it('encerrar sessão exige confirmação e libera o preset para edição', async () => {
    const usuario = userEvent.setup();
    persistirPresets([presetBase]);
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: 'Iniciar' }));
    await usuario.click(screen.getByRole('button', { name: 'Encerrar sessão' }));
    await usuario.click(within(obterDialogoAberto()).getByRole('button', { name: 'Encerrar sessão' }));

    expect(screen.getByText('Nenhuma sessão em andamento')).toBeInTheDocument();
    expect(lerSessaoPersistida()).toBeNull();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeEnabled();
  });

  it('reiniciar ciclos volta ao ciclo 1 após confirmação', async () => {
    const usuario = userEvent.setup();
    persistirPresets([presetBase]);
    const inicio = Date.now() - 31 * MIN; // já está no foco do ciclo 2
    localStorage.setItem(CHAVES.sessaoAtiva, JSON.stringify(sessaoDe(presetBase, {}, inicio)));
    render(<App />);

    expect(screen.getByText(/Ciclo 2 de 4/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Reiniciar ciclos' }));
    await usuario.click(within(obterDialogoAberto()).getByRole('button', { name: 'Reiniciar' }));
    expect(screen.getByText(/Ciclo 1 de 4/)).toBeInTheDocument();
  });
});

describe('retomada automática e descarte (UC10, UC11, RN-06, RN-07, R-03)', () => {
  it('restaura a sessão recalculando a fase pelos timestamps (RN-07)', () => {
    persistirPresets([presetBase]);
    // 31 min atrás: foco 1 (25) + pausa curta (5) já passaram; o foco 2 está em curso
    localStorage.setItem(CHAVES.sessaoAtiva, JSON.stringify(sessaoDe(presetBase, {}, Date.now() - 31 * MIN)));

    render(<App />);

    expect(screen.getByText('Sessão retomada automaticamente.', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Ciclo 2 de 4/)).toBeInTheDocument();
    expect(screen.getByText(/Foco/, { selector: '.temporizador__fase' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeDisabled();
  });

  it('sessão pausada retorna pausada, sem avanço (RN-06)', () => {
    persistirPresets([presetBase]);
    const inicio = Date.now() - 5 * 60 * MIN;
    const pausada = sessaoDe(
      presetBase,
      { status: 'pausada', pausadaEm: inicio + 3 * MIN, tempoRestanteAoPausarMs: 22 * MIN },
      inicio,
    );
    localStorage.setItem(CHAVES.sessaoAtiva, JSON.stringify(pausada));

    render(<App />);

    expect(screen.getByRole('button', { name: 'Retomar' })).toBeInTheDocument();
    expect(screen.getByRole('timer').textContent).toBe('22:00');
    expect(screen.getByText(/Ciclo 1 de 4/)).toBeInTheDocument();
  });

  it('sessão cujas fases venceram com o navegador fechado é concluída (RN-08)', () => {
    persistirPresets([presetBase]);
    // ~16 h atrás: todas as fases já venceram
    localStorage.setItem(CHAVES.sessaoAtiva, JSON.stringify(sessaoDe(presetBase, {}, Date.now() - 1000 * MIN)));

    render(<App />);

    expect(screen.getByText('Nenhuma sessão em andamento')).toBeInTheDocument();
    expect(localStorage.getItem(CHAVES.sessaoAtiva)).toBeNull();
    expect(screen.getByText(/concluída enquanto o navegador estava fechado/)).toBeInTheDocument();
  });

  it('descartar sessão retomada exige confirmação e remove a sessão sem histórico', async () => {
    const usuario = userEvent.setup();
    persistirPresets([presetBase]);
    localStorage.setItem(CHAVES.sessaoAtiva, JSON.stringify(sessaoDe(presetBase, {}, Date.now() - 31 * MIN)));
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: 'Descartar sessão' }));
    const dialogo = obterDialogoAberto();
    expect(localStorage.getItem(CHAVES.sessaoAtiva)).not.toBeNull();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Descartar' }));

    expect(localStorage.getItem(CHAVES.sessaoAtiva)).toBeNull();
    expect(screen.getByText('Nenhuma sessão em andamento')).toBeInTheDocument();
    expect(screen.getByText(/Nenhum progresso foi contabilizado/)).toBeInTheDocument();
  });

  it('sessão salva inconsistente é reportada e pode ser descartada (R-03)', async () => {
    const usuario = userEvent.setup();
    persistirPresets([presetBase]);
    localStorage.setItem(CHAVES.sessaoAtiva, '{"quebrada":');
    render(<App />);

    expect(screen.getByText(/dados da sessão salva estão inconsistentes/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Descartar dados da sessão' }));
    await usuario.click(within(obterDialogoAberto()).getByRole('button', { name: 'Descartar' }));
    expect(localStorage.getItem(CHAVES.sessaoAtiva)).toBeNull();
  });
});

describe('painel de tarefas (RF-15 a RF-19, RN-10, RN-12)', () => {
  it('cria tarefa com estado backlog e prioridade média por padrão', async () => {
    const usuario = userEvent.setup();
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: 'Nova tarefa' }));
    await usuario.type(within(obterDialogoAberto()).getByLabelText('Título'), 'Ler capítulo 4');
    await usuario.click(within(obterDialogoAberto()).getByRole('button', { name: 'Criar tarefa' }));

    const item = screen.getByText('Ler capítulo 4').closest('li') as HTMLElement;
    expect(within(item).getByText('Backlog')).toBeInTheDocument();
    expect(within(item).getByText('Prioridade média')).toBeInTheDocument();
  });

  it('título vazio impede a criação', async () => {
    const usuario = userEvent.setup();
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: 'Nova tarefa' }));
    await usuario.click(within(obterDialogoAberto()).getByRole('button', { name: 'Criar tarefa' }));
    expect(within(obterDialogoAberto()).getByText('Informe um título para a tarefa.')).toBeInTheDocument();
    expect(localStorage.getItem(CHAVES.tarefas)).toBeNull();
  });

  it('ordena por prioridade e depois por estado (RN-10)', () => {
    const base = { criadaEm: 1, atualizadaEm: 1 };
    const tarefas: Tarefa[] = [
      { id: 'a', titulo: 'Backlog baixa', estado: 'backlog', prioridade: 'baixa', ...base },
      { id: 'b', titulo: 'Fazer alta', estado: 'aFazer', prioridade: 'alta', ...base },
      { id: 'c', titulo: 'Cancelada alta', estado: 'cancelada', prioridade: 'alta', ...base },
      { id: 'd', titulo: 'Concluída media', estado: 'concluida', prioridade: 'media', ...base },
    ];
    localStorage.setItem(CHAVES.tarefas, JSON.stringify(tarefas));
    render(<App />);

    const titulos = screen.getAllByRole('listitem').map((li) => li.querySelector('.tarefa__titulo')?.textContent);
    expect(titulos).toEqual(['Fazer alta', 'Cancelada alta', 'Concluída media', 'Backlog baixa']);
  });

  it('editar tarefa altera estado e reordena o painel', async () => {
    const usuario = userEvent.setup();
    const base = { criadaEm: 1, atualizadaEm: 1 };
    localStorage.setItem(
      CHAVES.tarefas,
      JSON.stringify([
        { id: 'a', titulo: 'Primeira', estado: 'aFazer', prioridade: 'alta', ...base },
        { id: 'b', titulo: 'Segunda', estado: 'aFazer', prioridade: 'baixa', ...base },
      ]),
    );
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: 'Editar tarefa: Segunda' }));
    const dialogo = obterDialogoAberto();
    await usuario.selectOptions(within(dialogo).getByLabelText('Prioridade'), 'alta');
    await usuario.selectOptions(within(dialogo).getByLabelText('Estado'), 'emExecucao');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar alterações' }));

    const titulos = screen.getAllByRole('listitem').map((li) => li.querySelector('.tarefa__titulo')?.textContent);
    expect(titulos).toEqual(['Primeira', 'Segunda']);
    const segunda = screen.getByText('Segunda').closest('li') as HTMLElement;
    expect(within(segunda).getByText('Em execução')).toBeInTheDocument();
    expect(within(segunda).getByText('Prioridade alta')).toBeInTheDocument();
  });

  it('exclusão de tarefa exige confirmação', async () => {
    const usuario = userEvent.setup();
    localStorage.setItem(
      CHAVES.tarefas,
      JSON.stringify([{ id: 'a', titulo: 'Única', estado: 'backlog', prioridade: 'media', criadaEm: 1, atualizadaEm: 1 }]),
    );
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: 'Excluir tarefa: Única' }));
    await usuario.click(within(obterDialogoAberto()).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Única')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Excluir tarefa: Única' }));
    await usuario.click(within(obterDialogoAberto()).getByRole('button', { name: 'Excluir' }));
    expect(screen.queryByText('Única')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CHAVES.tarefas) ?? '[]')).toEqual([]);
  });
});
