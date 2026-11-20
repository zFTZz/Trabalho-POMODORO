import { describe, expect, it } from 'vitest';
import {
  avancarAteAgora,
  criarSessao,
  pausarSessao,
  pularFase,
  presetEmUso,
  reiniciarCiclos,
  retomarSessao,
  tempoRestanteMs,
} from './sessao';
import type { Preset, SessaoAtiva } from './tipos';

const MIN = 60_000;
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

function novaSessao(p: Preset = preset): SessaoAtiva {
  return criarSessao(p, T0, 's1');
}

describe('criarSessao (UC04, RN-05)', () => {
  it('inicia em foco, ciclo 1, em andamento, com fim calculado pelo tempo de foco', () => {
    const s = novaSessao();
    expect(s.faseAtual).toBe('foco');
    expect(s.cicloAtual).toBe(1);
    expect(s.status).toBe('emAndamento');
    expect(s.inicioFaseEm).toBe(T0);
    expect(s.fimFasePrevistoEm).toBe(T0 + 25 * MIN);
    expect(s.presetId).toBe('p1');
  });

  it('usa snapshot imune a edições posteriores do preset (RN-05)', () => {
    const editavel: Preset = { ...preset };
    const s = criarSessao(editavel, T0, 's1');
    editavel.tempoFocoMin = 50;
    editavel.nome = 'Outro';
    expect(s.snapshotPreset.tempoFocoMin).toBe(25);
    expect(s.snapshotPreset.nome).toBe('Estudo');
    expect(s.fimFasePrevistoEm).toBe(T0 + 25 * MIN);
  });
});

describe('pausar e retomar (UC05, RF-06, RF-07)', () => {
  it('preserva o tempo restante ao pausar', () => {
    const pausada = pausarSessao(novaSessao(), T0 + 10 * MIN);
    expect(pausada.status).toBe('pausada');
    expect(pausada.pausadaEm).toBe(T0 + 10 * MIN);
    expect(pausada.tempoRestanteAoPausarMs).toBe(15 * MIN);
    expect(tempoRestanteMs(pausada, T0 + 60 * MIN)).toBe(15 * MIN);
  });

  it('recalcula o fim da fase a partir do instante da retomada', () => {
    const pausada = pausarSessao(novaSessao(), T0 + 10 * MIN);
    const retomada = retomarSessao(pausada, T0 + 100 * MIN);
    expect(retomada.status).toBe('emAndamento');
    expect(retomada.fimFasePrevistoEm).toBe(T0 + 100 * MIN + 15 * MIN);
    expect(retomada.pausadaEm).toBeNull();
    expect(retomada.tempoRestanteAoPausarMs).toBeNull();
  });

  it('pausar uma sessão já pausada ou retomar uma em andamento não altera nada', () => {
    const s = novaSessao();
    expect(retomarSessao(s, T0 + MIN)).toBe(s);
    const pausada = pausarSessao(s, T0 + MIN);
    expect(pausarSessao(pausada, T0 + 2 * MIN)).toBe(pausada);
  });
});

describe('pular fase (UC06, RN-03)', () => {
  it('pular foco vai para a pausa do ciclo sem incrementar a contagem', () => {
    const s = pularFase(novaSessao(), T0 + MIN);
    expect(s.faseAtual).toBe('pausaCurta');
    expect(s.cicloAtual).toBe(1);
    expect(s.inicioFaseEm).toBe(T0 + MIN);
    expect(s.fimFasePrevistoEm).toBe(T0 + MIN + 5 * MIN);
  });

  it('pular pausa retorna ao foco sem incrementar a contagem de ciclos', () => {
    const emPausa = pularFase(novaSessao(), T0);
    const s = pularFase(emPausa, T0 + MIN);
    expect(s.faseAtual).toBe('foco');
    expect(s.cicloAtual).toBe(1);
  });

  it('pular durante pausa mantém a sessão pausada e congela a nova fase com tempo cheio', () => {
    const pausada = pausarSessao(pularFase(novaSessao(), T0), T0 + MIN);
    const s = pularFase(pausada, T0 + 2 * MIN);
    expect(s.status).toBe('pausada');
    expect(s.faseAtual).toBe('foco');
    expect(s.tempoRestanteAoPausarMs).toBe(25 * MIN);
  });

  it('pular a última fase antes da conclusão encerra a sessão (UC06 fluxo alternativo)', () => {
    // avanço natural até a pausa longa do último ciclo do preset (7 transições)
    let s = novaSessao();
    for (let i = 0; i < preset.ciclosAntesPausaLonga * 2 - 1; i++) {
      s = avancarAteAgora(s, s.fimFasePrevistoEm).sessao;
    }
    expect(s.faseAtual).toBe('pausaLonga');
    expect(s.cicloAtual).toBe(preset.ciclosAntesPausaLonga);

    const concluida = pularFase(s, s.fimFasePrevistoEm - MIN);
    expect(concluida.status).toBe('concluida');
    expect(presetEmUso('p1', concluida)).toBe(false);
  });
});

describe('reiniciar ciclos (UC07, RN-04)', () => {
  it('retorna ao foco do ciclo 1 e mantém o preset', () => {
    let s = novaSessao();
    s = avancarAteAgora(s, s.fimFasePrevistoEm).sessao; // foco 1 -> pausa curta 1
    s = avancarAteAgora(s, s.fimFasePrevistoEm).sessao; // pausa 1 -> foco 2
    expect(s.cicloAtual).toBe(2);

    const reiniciada = reiniciarCiclos(s, T0 + 40 * MIN);
    expect(reiniciada.cicloAtual).toBe(1);
    expect(reiniciada.faseAtual).toBe('foco');
    expect(reiniciada.presetId).toBe('p1');
    expect(reiniciada.status).toBe('emAndamento');
    expect(reiniciada.fimFasePrevistoEm).toBe(T0 + 40 * MIN + 25 * MIN);
  });

  it('mantém o status pausado ao reiniciar', () => {
    const pausada = pausarSessao(novaSessao(), T0 + MIN);
    const reiniciada = reiniciarCiclos(pausada, T0 + 2 * MIN);
    expect(reiniciada.status).toBe('pausada');
    expect(reiniciada.tempoRestanteAoPausarMs).toBe(25 * MIN);
  });
});

describe('avanço natural de fases (RF-14, RN-13)', () => {
  it('o ciclo avança ao fim do foco e a pausa já pertence ao próximo ciclo', () => {
    const r1 = avancarAteAgora(novaSessao(), T0 + 25 * MIN);
    expect(r1.fasesAvancadas).toBe(1);
    expect(r1.sessao.faseAtual).toBe('pausaCurta');
    expect(r1.sessao.cicloAtual).toBe(2);

    const r2 = avancarAteAgora(r1.sessao, r1.sessao.fimFasePrevistoEm);
    expect(r2.sessao.faseAtual).toBe('foco');
    expect(r2.sessao.cicloAtual).toBe(2);
  });

  it('usa pausa longa a cada ciclosAntesPausaLonga ciclos', () => {
    const preset3: Preset = { ...preset, ciclosAntesPausaLonga: 3 };
    let s = novaSessao(preset3);
    const fases: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = avancarAteAgora(s, s.fimFasePrevistoEm);
      if (r.concluida) break;
      s = r.sessao;
      fases.push(`${s.faseAtual}:${s.cicloAtual}`);
    }
    expect(fases).toEqual([
      'pausaCurta:2',
      'foco:2',
      'pausaCurta:3',
      'foco:3',
      'pausaLonga:3',
    ]);
  });

  it('sessão com preset de 6 ciclos só conclui após a pausa longa do ciclo 6', () => {
    const preset6: Preset = { ...preset, ciclosAntesPausaLonga: 6 };
    let s = novaSessao(preset6);
    for (let i = 0; i < preset6.ciclosAntesPausaLonga * 2 - 1; i++) {
      s = avancarAteAgora(s, s.fimFasePrevistoEm).sessao;
    }
    expect(s.faseAtual).toBe('pausaLonga');
    expect(s.cicloAtual).toBe(6);

    const r = avancarAteAgora(s, s.fimFasePrevistoEm);
    expect(r.concluida).toBe(true);
    expect(r.sessao.status).toBe('concluida');
  });

  it('a sessão conclui após o último intervalo do último ciclo (RN-08)', () => {
    const s = novaSessao();
    let r = { sessao: s, fasesAvancadas: 0, concluida: false };
    for (let i = 0; i < preset.ciclosAntesPausaLonga * 2; i++) {
      r = avancarAteAgora(r.sessao, r.sessao.fimFasePrevistoEm);
    }
    expect(r.concluida).toBe(true);
    expect(r.sessao.status).toBe('concluida');
  });
});

describe('recálculo após reabertura do navegador (UC10, RN-06, RN-07, RN-08)', () => {
  it('sessão pausada retorna pausada, sem avanço, mesmo após muito tempo (RN-06)', () => {
    const pausada = pausarSessao(novaSessao(), T0 + 5 * MIN);
    const r = avancarAteAgora(pausada, T0 + 10_000 * MIN);
    expect(r.fasesAvancadas).toBe(0);
    expect(r.sessao).toEqual(pausada);
  });

  it('sessão em andamento ainda dentro da fase mantém a fase e recalcula o restante', () => {
    const s = novaSessao();
    const r = avancarAteAgora(s, T0 + 3 * MIN);
    expect(r.fasesAvancadas).toBe(0);
    expect(r.sessao.faseAtual).toBe('foco');
    expect(tempoRestanteMs(r.sessao, T0 + 3 * MIN)).toBe(22 * MIN);
  });

  it('fase vencida avança pelos timestamps: a próxima fase começa no fim exato da anterior (RN-07)', () => {
    const s = novaSessao();
    // navegador fechado por 31 min: foco 1 (25) + pausa curta (5) => 1 min dentro do foco 2
    const r = avancarAteAgora(s, T0 + 31 * MIN);
    expect(r.fasesAvancadas).toBe(2);
    expect(r.sessao.faseAtual).toBe('foco');
    expect(r.sessao.cicloAtual).toBe(2);
    expect(r.sessao.inicioFaseEm).toBe(T0 + 30 * MIN);
    expect(r.sessao.fimFasePrevistoEm).toBe(T0 + 55 * MIN);
  });

  it('atravessa vários ciclos durante o período fechado', () => {
    const s = novaSessao();
    // ciclo completo = 25 + 5 = 30 min; 2 ciclos e 10 min => foco do ciclo 3
    const r = avancarAteAgora(s, T0 + 70 * MIN);
    expect(r.sessao.cicloAtual).toBe(3);
    expect(r.sessao.faseAtual).toBe('foco');
    expect(r.sessao.fimFasePrevistoEm).toBe(T0 + 60 * MIN + 25 * MIN);
  });

  it('se todas as fases venceram durante o período fechado, a sessão é concluída (RN-08)', () => {
    const s = novaSessao();
    // ciclos completos somam 130 min; o navegador ficou fechado por 10 horas
    const r = avancarAteAgora(s, T0 + 10 * 60 * MIN);
    expect(r.concluida).toBe(true);
    expect(r.sessao.status).toBe('concluida');
  });

  it('avanço cruzando a fronteira exata de uma fase é contabilizado', () => {
    const r = avancarAteAgora(novaSessao(), T0 + 25 * MIN);
    expect(r.fasesAvancadas).toBe(1);
  });
});

describe('presetEmUso (RN-01)', () => {
  it('reconhece quando há sessão ativa baseada no preset', () => {
    const s = novaSessao();
    expect(presetEmUso('p1', s)).toBe(true);
    expect(presetEmUso('outro', s)).toBe(false);
    expect(presetEmUso('p1', null)).toBe(false);
  });
});
