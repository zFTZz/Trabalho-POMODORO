import { presetEmUso } from '../dominio/sessao';
import type { Preset, SessaoAtiva } from '../dominio/tipos';

interface ListaPresetsProps {
  presets: readonly Preset[];
  sessao: SessaoAtiva | null;
  onNovo: () => void;
  onIniciar: (preset: Preset) => void;
  onEditar: (preset: Preset) => void;
  onExcluir: (preset: Preset) => void;
}

/** RF-04 / RF-05 / RF-02 / RF-03 - listagem de temporizadores personalizados (presets). */
export function ListaPresets({ presets, sessao, onNovo, onIniciar, onEditar, onExcluir }: ListaPresetsProps) {
  return (
    <section className="cartao" aria-labelledby="titulo-presets">
      <div className="cartao__cabecalho">
        <div>
          <h2 id="titulo-presets" className="cartao__titulo">
            Temporizadores
          </h2>
          <p className="cartao__subtitulo">Configurações reutilizáveis de foco e pausa.</p>
        </div>
        <button type="button" className="botao botao--primario" onClick={onNovo}>
          Novo temporizador
        </button>
      </div>

      {sessao && sessao.status !== 'concluida' && (
        <p className="aviso-inline">
          Iniciar outro temporizador encerra automaticamente a sessão em andamento.
        </p>
      )}

      {presets.length === 0 ? (
        <p className="vazio">Nenhum temporizador cadastrado. Crie o primeiro para começar a estudar com foco.</p>
      ) : (
        <ul className="presets">
          {presets.map((preset) => {
            const emUso = presetEmUso(preset.id, sessao);
            return (
              <li key={preset.id} className={`preset${emUso ? ' preset--em-uso' : ''}`}>
                <div className="preset__cabecalho">
                  <h3 className="preset__nome">{preset.nome}</h3>
                  {emUso && <span className="etiqueta etiqueta--ativa">Em uso</span>}
                </div>

                <dl className="preset__parametros">
                  <div>
                    <dt>Foco</dt>
                    <dd>{preset.tempoFocoMin} min</dd>
                  </div>
                  <div>
                    <dt>Pausa curta</dt>
                    <dd>{preset.tempoPausaCurtaMin} min</dd>
                  </div>
                  <div>
                    <dt>Pausa longa</dt>
                    <dd>{preset.tempoPausaLongaMin} min</dd>
                  </div>
                  <div>
                    <dt>Pausa longa após</dt>
                    <dd>
                      {preset.ciclosAntesPausaLonga} {preset.ciclosAntesPausaLonga === 1 ? 'ciclo' : 'ciclos'}
                    </dd>
                  </div>
                </dl>

                <div className="preset__acoes">
                  <button
                    type="button"
                    className="botao botao--primario"
                    disabled={emUso}
                    onClick={() => onIniciar(preset)}
                  >
                    {emUso ? 'Em andamento' : 'Iniciar'}
                  </button>
                  <button type="button" className="botao botao--secundario" disabled={emUso} onClick={() => onEditar(preset)}>
                    Editar
                  </button>
                  <button type="button" className="botao botao--perigo-suave" disabled={emUso} onClick={() => onExcluir(preset)}>
                    Excluir
                  </button>
                </div>

                {emUso && (
                  <p className="preset__aviso">
                    Em uso pela sessão ativa. Encerre a sessão para editar ou excluir este temporizador.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

