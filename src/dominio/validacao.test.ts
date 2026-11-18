import { describe, expect, it } from 'vitest';
import { validarPreset, validarTarefa } from './validacao';

const presetValido = {
  nome: 'Estudo',
  tempoFocoMin: '25',
  tempoPausaCurtaMin: '5',
  ciclosAntesPausaLonga: '4',
  tempoPausaLongaMin: '15',
};

describe('validarPreset (VR-01 a VR-05)', () => {
  it('aceita valores válidos e normaliza os tipos', () => {
    const r = validarPreset({ ...presetValido, nome: '  Estudo  ' });
    expect(r).toEqual({
      valido: true,
      dados: { nome: 'Estudo', tempoFocoMin: 25, tempoPausaCurtaMin: 5, ciclosAntesPausaLonga: 4, tempoPausaLongaMin: 15 },
    });
  });

  it('aceita os limites exatos', () => {
    expect(
      validarPreset({
        nome: 'x'.repeat(40),
        tempoFocoMin: '120',
        tempoPausaCurtaMin: '1',
        ciclosAntesPausaLonga: '12',
        tempoPausaLongaMin: '60',
      }).valido,
    ).toBe(true);
    expect(
      validarPreset({ nome: 'a', tempoFocoMin: '1', tempoPausaCurtaMin: '60', ciclosAntesPausaLonga: '1', tempoPausaLongaMin: '1' })
        .valido,
    ).toBe(true);
  });

  it('exige nome e rejeita nome vazio ou com mais de 40 caracteres', () => {
    const vazio = validarPreset({ ...presetValido, nome: '   ' });
    expect(vazio.valido).toBe(false);
    if (!vazio.valido) expect(vazio.erros.nome).toBeDefined();

    const longo = validarPreset({ ...presetValido, nome: 'x'.repeat(41) });
    expect(longo.valido).toBe(false);
    if (!longo.valido) expect(longo.erros.nome).toMatch(/entre 1 e 40/);
  });

  it('rejeita valores fora dos limites com mensagem por campo', () => {
    const r = validarPreset({
      nome: 'ok',
      tempoFocoMin: '0',
      tempoPausaCurtaMin: '61',
      ciclosAntesPausaLonga: '13',
      tempoPausaLongaMin: '121',
    });
    expect(r.valido).toBe(false);
    if (r.valido) return;
    expect(r.erros.tempoFocoMin).toMatch(/entre 1 e 120/);
    expect(r.erros.tempoPausaCurtaMin).toMatch(/entre 1 e 60/);
    expect(r.erros.ciclosAntesPausaLonga).toMatch(/entre 1 e 12/);
    expect(r.erros.tempoPausaLongaMin).toMatch(/entre 1 e 60/);
  });

  it('rejeita números decimais, texto e campos vazios', () => {
    const r = validarPreset({ ...presetValido, tempoFocoMin: '2.5', tempoPausaCurtaMin: 'abc', ciclosAntesPausaLonga: '' });
    expect(r.valido).toBe(false);
    if (r.valido) return;
    expect(r.erros.tempoFocoMin).toMatch(/inteiro/);
    expect(r.erros.tempoPausaCurtaMin).toMatch(/inteiro/);
    expect(r.erros.ciclosAntesPausaLonga).toMatch(/obrigatório/);
  });
});

describe('validarTarefa (VR-06 a VR-08)', () => {
  it('aceita tarefa válida', () => {
    expect(validarTarefa({ titulo: ' Ler capítulo 3 ', estado: 'aFazer', prioridade: 'alta' })).toEqual({
      valido: true,
      dados: { titulo: 'Ler capítulo 3', estado: 'aFazer', prioridade: 'alta' },
    });
  });

  it('rejeita título vazio e com mais de 100 caracteres', () => {
    const vazio = validarTarefa({ titulo: '  ', estado: 'backlog', prioridade: 'media' });
    expect(vazio.valido).toBe(false);
    const longo = validarTarefa({ titulo: 'x'.repeat(101), estado: 'backlog', prioridade: 'media' });
    expect(longo.valido).toBe(false);
    if (!longo.valido) expect(longo.erros.titulo).toMatch(/entre 1 e 100/);
  });

  it('rejeita estado e prioridade fora dos valores permitidos', () => {
    const r = validarTarefa({ titulo: 'ok', estado: 'pronta', prioridade: 'urgente' });
    expect(r.valido).toBe(false);
    if (r.valido) return;
    expect(r.erros.estado).toBeDefined();
    expect(r.erros.prioridade).toBeDefined();
  });
});
