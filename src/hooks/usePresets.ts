import { useCallback, useState } from 'react';
import { ordenarPresetsPorCriacao } from '../dominio/presets';
import type { DadosPreset, Preset } from '../dominio/tipos';
import { type Armazenamento, carregarPresets, salvarPresets } from '../persistencia';
import { gerarId, mensagemDeErro } from '../utils';
import type { Notificar } from './notificacao';

/** Gerencia a lista de presets (RF-01 a RF-04) com persistência em Local Storage. */
export function usePresets(
  arm: Armazenamento,
  notificar: Notificar,
  estaEmUso: (presetId: string) => boolean,
) {
  const [carregamento] = useState(() => carregarPresets(arm));
  const [presets, setPresets] = useState<Preset[]>(() => ordenarPresetsPorCriacao(carregamento.itens));

  const persistir = useCallback(
    (lista: Preset[]): boolean => {
      try {
        salvarPresets(arm, lista);
        setPresets(lista);
        return true;
      } catch (erro) {
        notificar('erro', mensagemDeErro(erro));
        return false;
      }
    },
    [arm, notificar],
  );

  const criar = useCallback(
    (dados: DadosPreset): boolean => {
      const agora = Date.now();
      const novo: Preset = { ...dados, id: gerarId(), criadoEm: agora, atualizadoEm: agora };
      const ok = persistir([...presets, novo]);
      if (ok) notificar('sucesso', `Temporizador "${novo.nome}" criado.`);
      return ok;
    },
    [persistir, presets, notificar],
  );

  const atualizar = useCallback(
    (id: string, dados: DadosPreset): boolean => {
      // RN-01 / UC02: preset em uso por sessão ativa não pode ser editado.
      if (estaEmUso(id)) {
        notificar('erro', 'Este temporizador está em uso por uma sessão ativa e não pode ser editado.');
        return false;
      }
      const lista = presets.map((p) => (p.id === id ? { ...p, ...dados, atualizadoEm: Date.now() } : p));
      const ok = persistir(lista);
      if (ok) notificar('sucesso', `Temporizador "${dados.nome}" atualizado.`);
      return ok;
    },
    [estaEmUso, persistir, presets, notificar],
  );

  const excluir = useCallback(
    (id: string): boolean => {
      // RN-01 / UC03: preset em uso por sessão ativa não pode ser excluído.
      if (estaEmUso(id)) {
        notificar('erro', 'Este temporizador está em uso por uma sessão ativa e não pode ser excluído.');
        return false;
      }
      const ok = persistir(presets.filter((p) => p.id !== id));
      if (ok) notificar('sucesso', 'Temporizador excluído.');
      return ok;
    },
    [estaEmUso, persistir, presets, notificar],
  );

  return { presets, criar, atualizar, excluir, carregamento };
}
