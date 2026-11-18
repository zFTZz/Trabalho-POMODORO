import { type FormEvent, useId, useRef, useState } from 'react';
import { LIMITES, VALORES_PADRAO_PRESET } from '../dominio/constantes';
import type { DadosPreset, Preset } from '../dominio/tipos';
import { type EntradaPreset, validarPreset } from '../dominio/validacao';
import { Campo, descricaoCampo, focarPrimeiroErro, ResumoErros } from './Campos';

interface FormularioPresetProps {
  presetEditando: Preset | null;
  /** Retorna `true` quando os dados foram persistidos com sucesso. */
  onSalvar: (dados: DadosPreset) => boolean;
  onCancelar: () => void;
}

type Campos = keyof EntradaPreset;

/** Nome legivel de cada campo, usado no resumo de erros. */
const NOMES_CAMPOS: Record<Campos, string> = {
  nome: 'Nome do temporizador',
  tempoFocoMin: 'Tempo de foco',
  tempoPausaCurtaMin: 'Pausa curta',
  ciclosAntesPausaLonga: 'Ciclos antes da pausa longa',
  tempoPausaLongaMin: 'Pausa longa',
};

function valoresIniciais(preset: Preset | null): EntradaPreset {
  if (preset) {
    return {
      nome: preset.nome,
      tempoFocoMin: String(preset.tempoFocoMin),
      tempoPausaCurtaMin: String(preset.tempoPausaCurtaMin),
      ciclosAntesPausaLonga: String(preset.ciclosAntesPausaLonga),
      tempoPausaLongaMin: String(preset.tempoPausaLongaMin),
    };
  }
  return {
    nome: '',
    tempoFocoMin: String(VALORES_PADRAO_PRESET.tempoFocoMin),
    tempoPausaCurtaMin: String(VALORES_PADRAO_PRESET.tempoPausaCurtaMin),
    ciclosAntesPausaLonga: String(VALORES_PADRAO_PRESET.ciclosAntesPausaLonga),
    tempoPausaLongaMin: String(VALORES_PADRAO_PRESET.tempoPausaLongaMin),
  };
}

/** RF-01 / RF-02 / UC01 / UC02: formulario de criacao e edicao de presets. */
export function FormularioPreset({ presetEditando, onSalvar, onCancelar }: FormularioPresetProps) {
  const base = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [valores, setValores] = useState<EntradaPreset>(() => valoresIniciais(presetEditando));
  const [erros, setErros] = useState<Partial<Record<Campos, string>>>({});

  const atualizarCampo = (campo: Campos, valor: string) => {
    setValores((anterior) => ({ ...anterior, [campo]: valor }));
  };

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const resultado = validarPreset(valores);
    if (!resultado.valido) {
      setErros(resultado.erros);
      // O foco precisa acompanhar o erro: sem isso o leitor de tela fica no botao.
      window.requestAnimationFrame(() => focarPrimeiroErro(formRef.current));
      return;
    }
    setErros({});
    onSalvar(resultado.dados);
  };

  const idCampo = (campo: Campos) => `${base}-${campo}`;
  const dicaMinutos = (min: number, max: number) => `De ${min} a ${max} minutos.`;
  const listaErros = (Object.keys(erros) as Campos[]).map((campo) => `${NOMES_CAMPOS[campo]}: ${erros[campo]}`);

  return (
    <form ref={formRef} className="formulario" onSubmit={enviar} noValidate>
      <ResumoErros erros={listaErros} idBase={`${base}-resumo`} />

      <Campo
        id={idCampo('nome')}
        rotulo="Nome do temporizador"
        dica={`De ${LIMITES.nome.min} a ${LIMITES.nome.max} caracteres.`}
        erro={erros.nome}
      >
        <input
          id={idCampo('nome')}
          type="text"
          autoComplete="off"
          value={valores.nome}
          onChange={(e) => atualizarCampo('nome', e.target.value)}
          aria-invalid={erros.nome ? true : undefined}
          aria-describedby={descricaoCampo(idCampo('nome'), true, Boolean(erros.nome))}
        />
      </Campo>

      <div className="formulario__grade">
        <CampoNumerico
          id={idCampo('tempoFocoMin')}
          rotulo="Tempo de foco (min)"
          faixa={LIMITES.tempoFocoMin}
          dica={dicaMinutos(LIMITES.tempoFocoMin.min, LIMITES.tempoFocoMin.max)}
          valor={valores.tempoFocoMin}
          erro={erros.tempoFocoMin}
          onChange={(v) => atualizarCampo('tempoFocoMin', v)}
        />
        <CampoNumerico
          id={idCampo('tempoPausaCurtaMin')}
          rotulo="Pausa curta (min)"
          faixa={LIMITES.tempoPausaCurtaMin}
          dica={dicaMinutos(LIMITES.tempoPausaCurtaMin.min, LIMITES.tempoPausaCurtaMin.max)}
          valor={valores.tempoPausaCurtaMin}
          erro={erros.tempoPausaCurtaMin}
          onChange={(v) => atualizarCampo('tempoPausaCurtaMin', v)}
        />
        <CampoNumerico
          id={idCampo('ciclosAntesPausaLonga')}
          rotulo="Ciclos antes da pausa longa"
          faixa={LIMITES.ciclosAntesPausaLonga}
          dica={`De ${LIMITES.ciclosAntesPausaLonga.min} a ${LIMITES.ciclosAntesPausaLonga.max} ciclos.`}
          valor={valores.ciclosAntesPausaLonga}
          erro={erros.ciclosAntesPausaLonga}
          onChange={(v) => atualizarCampo('ciclosAntesPausaLonga', v)}
        />
        <CampoNumerico
          id={idCampo('tempoPausaLongaMin')}
          rotulo="Pausa longa (min)"
          faixa={LIMITES.tempoPausaLongaMin}
          dica={dicaMinutos(LIMITES.tempoPausaLongaMin.min, LIMITES.tempoPausaLongaMin.max)}
          valor={valores.tempoPausaLongaMin}
          erro={erros.tempoPausaLongaMin}
          onChange={(v) => atualizarCampo('tempoPausaLongaMin', v)}
        />
      </div>

      <div className="dialogo__acoes">
        <button type="button" className="botao botao--secundario" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--primario">
          {presetEditando ? 'Salvar alterações' : 'Criar temporizador'}
        </button>
      </div>
    </form>
  );
}

interface CampoNumericoProps {
  id: string;
  rotulo: string;
  faixa: { min: number; max: number };
  dica: string;
  valor: string;
  erro?: string;
  onChange: (valor: string) => void;
}

function CampoNumerico({ id, rotulo, faixa, dica, valor, erro, onChange }: CampoNumericoProps) {
  return (
    <Campo id={id} rotulo={rotulo} dica={dica} erro={erro}>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        step={1}
        min={faixa.min}
        max={faixa.max}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricaoCampo(id, true, Boolean(erro))}
      />
    </Campo>
  );
}
