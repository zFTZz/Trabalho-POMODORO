import { describe, expect, it } from 'vitest';
import type { Preset, SessaoAtiva, Tarefa } from '../dominio/tipos';
import { criarSessao, pausarSessao } from '../dominio/sessao';
import {
  CHAVES,
  criarArmazenamentoDoNavegador,
  criarArmazenamentoLocal,
  ErroPersistencia,
  carregarPresets,
  carregarSessao,
  carregarTarefas,
  removerSessao,
  salvarPresets,
  salvarSessao,
  salvarTarefas,
  type Armazenamento,
} from './index';

/** Storage em memória compatível com a interface `Storage` usada pelo adaptador. */
function criarStorageFalso(): Storage & { mapa: Map<string, string> } {
  const mapa = new Map<string, string>();
  return {
    mapa,
    get length() {
      return mapa.size;
    },
    clear: () => mapa.clear(),
    getItem: (k) => (mapa.has(k) ? (mapa.get(k) as string) : null),
    key: (i) => Array.from(mapa.keys())[i] ?? null,
    removeItem: (k) => void mapa.delete(k),
    setItem: (k, v) => void mapa.set(k, String(v)),
  };
}

function armazenamento(): Armazenamento & { storage: ReturnType<typeof criarStorageFalso> } {
  const storage = criarStorageFalso();
  return { ...criarArmazenamentoLocal(storage), storage };
}

const T0 = 1_700_000_000_000;

const preset: Preset = {
  id: 'p1',
  nome: 'Estudo',
  tempoFocoMin: 25,
  tempoPausaCurtaMin: 5,
  ciclosAntesPausaLonga: 4,
  tempoPausaLongaMin: 15,
  criadoEm: T0,
  atualizadoEm: T0,
};

const tarefa: Tarefa = {
  id: 't1',
  titulo: 'Revisar matemática',
  estado: 'aFazer',
  prioridade: 'alta',
  criadaEm: T0,
  atualizadaEm: T0,
};

describe('presets', () => {
  it('ida e volta preserva os dados', () => {
    const arm = armazenamento();
    salvarPresets(arm, [preset]);
    const r = carregarPresets(arm);
    expect(r).toEqual({ itens: [preset], descartados: 0 });
    expect(arm.storage.mapa.has(CHAVES.presets)).toBe(true);
  });

  it('lista vazia quando não há dados', () => {
    expect(carregarPresets(armazenamento())).toEqual({ itens: [], descartados: 0 });
  });

  it('JSON corrompido é reportado sem quebrar a aplicação', () => {
    const arm = armazenamento();
    arm.storage.setItem(CHAVES.presets, '{not json');
    const r = carregarPresets(arm);
    expect(r.itens).toEqual([]);
    expect(r.problema).toMatch(/corrompidos/);
  });

  it('formato inesperado (não lista) é reportado', () => {
    const arm = armazenamento();
    arm.storage.setItem(CHAVES.presets, JSON.stringify({ a: 1 }));
    expect(carregarPresets(arm).problema).toMatch(/formato inválido/);
  });

  it('registros inválidos são descartados e contabilizados (R-03)', () => {
    const arm = armazenamento();
    const invalido = { ...preset, id: 'p2', tempoFocoMin: 999 };
    arm.storage.setItem(CHAVES.presets, JSON.stringify([preset, invalido, 'lixo', null]));
    const r = carregarPresets(arm);
    expect(r.itens).toEqual([preset]);
    expect(r.descartados).toBe(3);
  });
});

describe('tarefas', () => {
  it('ida e volta preserva os dados', () => {
    const arm = armazenamento();
    salvarTarefas(arm, [tarefa]);
    expect(carregarTarefas(arm)).toEqual({ itens: [tarefa], descartados: 0 });
  });

  it('descarta tarefas com estado ou prioridade desconhecidos', () => {
    const arm = armazenamento();
    arm.storage.setItem(
      CHAVES.tarefas,
      JSON.stringify([tarefa, { ...tarefa, id: 't2', estado: 'pronta' }, { ...tarefa, id: 't3', prioridade: 'urgente' }]),
    );
    const r = carregarTarefas(arm);
    expect(r.itens.map((t) => t.id)).toEqual(['t1']);
    expect(r.descartados).toBe(2);
  });
});

describe('sessão ativa (RF-12, RNF-02, R-03)', () => {
  it('sem registro, retorna vazia', () => {
    expect(carregarSessao(armazenamento())).toEqual({ tipo: 'vazia' });
  });

  it('ida e volta de sessão em andamento', () => {
    const arm = armazenamento();
    const s = criarSessao(preset, T0, 's1');
    salvarSessao(arm, s);
    expect(carregarSessao(arm)).toEqual({ tipo: 'valida', sessao: s });
  });

  it('ida e volta de sessão pausada preserva o tempo restante', () => {
    const arm = armazenamento();
    const s: SessaoAtiva = pausarSessao(criarSessao(preset, T0, 's1'), T0 + 60_000);
    salvarSessao(arm, s);
    const r = carregarSessao(arm);
    expect(r.tipo).toBe('valida');
    if (r.tipo === 'valida') expect(r.sessao.tempoRestanteAoPausarMs).toBe(24 * 60_000);
  });

  it('JSON inválido é marcado como inválido (para oferecer descarte)', () => {
    const arm = armazenamento();
    arm.storage.setItem(CHAVES.sessaoAtiva, '<<<');
    expect(carregarSessao(arm)).toEqual({ tipo: 'invalida' });
  });

  it('sessão pausada sem tempo restante é inconsistente', () => {
    const arm = armazenamento();
    const s = pausarSessao(criarSessao(preset, T0, 's1'), T0 + 1000);
    arm.storage.setItem(CHAVES.sessaoAtiva, JSON.stringify({ ...s, tempoRestanteAoPausarMs: null }));
    expect(carregarSessao(arm)).toEqual({ tipo: 'invalida' });
  });

  it('ciclo fora do intervalo é inconsistente', () => {
    const arm = armazenamento();
    const s = criarSessao(preset, T0, 's1');
    arm.storage.setItem(CHAVES.sessaoAtiva, JSON.stringify({ ...s, cicloAtual: 99 }));
    expect(carregarSessao(arm)).toEqual({ tipo: 'invalida' });
  });

  it('ciclo além do total de ciclos do snapshot é inconsistente', () => {
    const arm = armazenamento();
    const s = criarSessao(preset, T0, 's1');
    arm.storage.setItem(CHAVES.sessaoAtiva, JSON.stringify({ ...s, cicloAtual: s.snapshotPreset.ciclosAntesPausaLonga + 1 }));
    expect(carregarSessao(arm)).toEqual({ tipo: 'invalida' });
  });

  it('remoção limpa a chave', () => {
    const arm = armazenamento();
    salvarSessao(arm, criarSessao(preset, T0, 's1'));
    removerSessao(arm);
    expect(carregarSessao(arm)).toEqual({ tipo: 'vazia' });
  });

  it('falha de leitura é tratada como sessão inválida, sem exceção (RNF-06)', () => {
    const arm: Armazenamento = {
      ler() {
        throw new ErroPersistencia('armazenamento bloqueado');
      },
      gravar() {},
      remover() {},
    };
    expect(carregarSessao(arm)).toEqual({ tipo: 'invalida' });
  });
});

describe('falhas de gravação (RNF-06)', () => {
  it('converte falha do Storage em ErroPersistencia com mensagem em português', () => {
    const storage = criarStorageFalso();
    storage.setItem = () => {
      throw new DOMException('cheio', 'QuotaExceededError');
    };
    const arm = criarArmazenamentoLocal(storage);
    expect(() => arm.gravar('x', 'y')).toThrow(ErroPersistencia);
    expect(() => arm.gravar('x', 'y')).toThrow(/armazenamento pode estar cheio/);
  });

  it('acesso bloqueado a window.localStorage não derruba a inicialização', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('bloqueado', 'SecurityError');
      },
    });
    try {
      const arm = criarArmazenamentoDoNavegador();
      expect(() => arm.ler('x')).toThrow(ErroPersistencia);
      expect(() => arm.gravar('x', 'y')).toThrow(ErroPersistencia);
      expect(() => arm.remover('x')).toThrow(ErroPersistencia);
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });
});
