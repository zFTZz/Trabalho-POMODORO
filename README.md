# Foco Pomodoro

Aplicação web de gestão de foco baseada na técnica Pomodoro, voltada a estudantes que querem organizar ciclos de estudo. Funciona inteiramente no navegador, sem backend, e persiste os dados em **Local Storage**.

Trabalho da disciplina **Desenvolvimento Web (DevWeb)**, seguindo o *Documento de Requisitos de Software — Aplicação Web de Gestão de Foco (Pomodoro)*.

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Como executar](#como-executar)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Decisões técnicas](#decisões-técnicas)
- [Interpretações e decisões de requisitos](#interpretações-e-decisões-de-requisitos)
- [Verificação](#verificação)
- [Equipe e divisão de responsabilidades](#equipe-e-divisão-de-responsabilidades)

---

## Funcionalidades

**Temporizadores personalizados (presets)** — RF-01 a RF-04
- Criar, editar, excluir e listar temporizadores com nome, tempo de foco, pausa curta, ciclos antes da pausa longa e pausa longa.
- Validação por campo, com mensagens claras (VR-01 a VR-05). Dados inválidos não são salvos.
- Preset em uso por sessão ativa não pode ser editado nem excluído (RN-01).

**Sessão de foco** — RF-05 a RF-11, RF-14
- Iniciar sessão a partir de um temporizador (RN-05: a sessão usa um *snapshot* dos parâmetros, imune a edições posteriores).
- Pausar e retomar (o tempo restante é preservado e o fim da fase é recalculado na retomada).
- Pular fase, reiniciar ciclos (com confirmação) e encerrar sessão (com confirmação).
- Trocar de temporizador encerra automaticamente a sessão atual (RN-02).
- Alerta sonoro ao fim de cada fase (síntese com Web Audio, sem arquivos de som).

**Persistência e retomada** — RF-12, RF-13, RN-06 a RN-08
- A sessão ativa é salva com timestamps absolutos. Ao reabrir o navegador, o estado é recalculado:
  - sessão pausada volta pausada, sem avanço;
  - fases vencidas são percorridas em sequência até a fase vigente;
  - se todas as fases venceram, a sessão é concluída.
- Banner de sessão retomada, com opção de **descartar** (com confirmação e sem contabilizar progresso).
- Dados inconsistentes no Local Storage são detectados e a interface oferece descartá-los (R-03).

**Painel lateral de tarefas** — RF-15 a RF-20
- Criar, editar e excluir tarefas com título, estado (backlog, a fazer, em execução, concluída, cancelada) e prioridade (alta, média, baixa).
- Valores padrão: backlog e prioridade média (RN-12).
- Ordenação fixa: prioridade (alta → baixa) e, em seguida, estado (RN-10).
- Exclusões sempre pedem confirmação (RN-11).

**Interface** — RNF-04, RNF-05, RNF-07
- Interface em português, sem seletor de idioma.
- Layout responsivo: no desktop, o painel de tarefas fica à direita do temporizador; no celular, o painel é reorganizado logo abaixo do temporizador.
- Controles acessíveis por teclado, com rótulos semânticos, diálogos modais nativos (`<dialog>`) e foco visível.

**Fora do escopo** (conforme o documento): autenticação, backend, sincronização, notificações do navegador, filtros, subtarefas, analytics e internacionalização.

---

## Como executar

Requisitos: **Node.js 20.19+ ou 22.12+** e npm.

```bash
cd DevWeb/Pomodoro
npm install
npm run dev        # servidor de desenvolvimento em http://localhost:5173
```

Outros comandos:

| Comando           | Função                                              |
|-------------------|-----------------------------------------------------|
| `npm run build`   | Checagem de tipos (`tsc -b`) e build de produção em `dist/` |
| `npm run preview` | Serve o build de produção em http://localhost:4173  |
| `npm test`        | Executa a suíte de testes (Vitest)                  |
| `npm run test:watch` | Testes em modo interativo                        |
| `npm run lint`    | ESLint (TypeScript + regras de React Hooks)         |
| `npm run typecheck` | Apenas a checagem de tipos                        |

---

## Estrutura do projeto

```
DevWeb/Pomodoro/
├── index.html
├── vite.config.ts           # build, dev server e configuração do Vitest
├── tsconfig*.json           # TypeScript estrito (app e configs de build)
├── eslint.config.js
└── src/
    ├── dominio/             # regras de negócio puras (sem React, sem storage)
    │   ├── tipos.ts         # modelo conceitual (seção 11 do documento)
    │   ├── constantes.ts    # limites de validação, rótulos e ordenação
    │   ├── validacao.ts     # VR-01 a VR-08
    │   ├── sessao.ts        # máquina de estados da sessão baseada em timestamps
    │   ├── tarefas.ts       # ordenação fixa (RN-10) e valores padrão (RN-12)
    │   └── *.test.ts        # testes unitários das regras
    ├── persistencia/        # Local Storage, validação de leitura e repositórios
    │   ├── armazenamento.ts # adaptador sobre Storage e erros em português
    │   ├── validacaoPersistida.ts
    │   ├── repositorios.ts  # chaves pomodoro.presets, pomodoro.tarefas, pomodoro.sessaoAtiva
    │   └── persistencia.test.ts
    ├── hooks/               # estado da aplicação (presets, tarefas, sessão, tempo)
    ├── audio/alerta.ts      # alerta sonoro com Web Audio API
    ├── componentes/         # interface (temporizador, listas, formulários, diálogos)
    ├── App.tsx              # composição da tela
    ├── App.test.tsx         # testes de fluxo na interface
    └── styles.css           # CSS próprio, responsivo (mobile-first)
```

A separação segue o requisito RNF-09: **domínio** (regras), **persistência** (Local Storage) e **interface** (React) são camadas independentes. As regras de sessão não dependem de React e são testadas isoladamente.

---

## Decisões técnicas

- **Stack:** TypeScript (modo estrito) e React 19, com Vite como ferramenta de build. Não há backend (RT-03).
- **Estilo:** CSS próprio com variáveis, sem framework. Mobile-first, com um único breakpoint em 960 px para o layout de duas colunas.
- **Tempo baseado em timestamps:** a sessão guarda `inicioFaseEm`, `fimFasePrevistoEm` e, quando pausada, `tempoRestanteAoPausarMs`, todos como milissegundos Unix. O cronômetro na tela é apenas uma renderização de `fim - agora`, a cada 250 ms. Assim, abas em segundo plano ou navegador fechado não causam perda de progresso (RNF-03, R-02).
- **Avanço de fases:** a função `avancarAteAgora` é pura. Cada fase começa exatamente no instante em que a anterior terminou (`inicioFaseEm = fimAnterior`), então a linha do tempo fica precisa mesmo após longos períodos fechados.
- **Funções puras para a sessão:** todas as transições (`pausarSessao`, `retomarSessao`, `pularFase`, `reiniciarCiclos`, `avancarAteAgora`) recebem o estado e `agora` e devolvem um novo estado. Isso facilita testar cada caso de uso.
- **Validação em duas camadas:** os formulários validam a entrada (VR-01 a VR-08), e a leitura do Local Storage valida cada registro (R-03). Registros inválidos são descartados e o usuário é avisado.
- **Erros de persistência reportados:** falhas de leitura ou escrita (por exemplo, armazenamento cheio) aparecem como mensagens, sem quebrar a aplicação (RNF-06).
- **Alerta sonoro:** sons gerados com `OscillatorNode`, sem arquivos externos. Como os navegadores bloqueiam áudio sem interação (R-01, RNF-10), o `AudioContext` é criado e liberado no primeiro gesto do usuário na página.
- **Diálogos:** o elemento nativo `<dialog>` com `showModal()` oferece foco preso, fechamento com Esc e retorno do foco, sem dependências extras.
- **Testes:** Vitest para as regras de domínio e persistência, e React Testing Library com jsdom para os fluxos de interface (criar, editar, excluir com confirmação, sessão, retomada e descarte).
- **Dependências:** `package-lock.json` versionado para instalação reproduzível.

---

## Interpretações e decisões de requisitos

Alguns pontos do documento são ambíguos ou se contradizem. A equipe adotou as seguintes decisões:

1. **Quantidade de ciclos por sessão (`CICLOS_POR_SESSAO = 4`).** O documento exige o status `concluida` (RN-08 e UC10), mas não define quantos ciclos formam uma sessão. Adotamos 4 ciclos, o "conjunto" clássico da técnica. A sessão é concluída ao terminar a última pausa do último ciclo. O valor está em `src/dominio/constantes.ts` e pode ser alterado.

2. **Contagem de ciclos com pulos (RN-03).** O ciclo só avança quando uma pausa termina naturalmente. Pular fases nunca altera a contagem. Consequência: pular uma pausa retorna ao foco do mesmo ciclo, e não ao início do próximo. Foi a leitura literal de RN-03.

3. **Conflito entre RF-19 e RN-10 na ordem dos estados.** O RF-19 lista `backlog, a fazer, em execução, concluída, cancelada`, enquanto o RN-10 (referenciado por RF-18, RF-19 e UC15) define `a fazer, em execução, concluída, cancelada, backlog`. **Adotamos a ordem do RN-10**, por ser a regra de negócio explícita e a referência dos casos de uso.

4. **Desempate na ordenação.** Tarefas com mesma prioridade e estado aparecem da mais antiga para a mais nova (data de criação). O documento não define esse critério.

5. **Trocar temporizador (UC09).** Conforme o caso de uso, a troca encerra a sessão sem confirmação adicional. A interface avisa isso acima da lista de temporizadores e exibe uma mensagem ao trocar.

6. **Concluir sessão.** Não há histórico de produtividade (fora do escopo). Ao concluir, a sessão é removida do Local Storage e o usuário recebe uma mensagem.

7. **Alerta sonoro na retomada.** Quando a sessão é recalculada ao abrir a página, o som não toca, porque não há gesto do usuário para desbloquear o áudio. O alerta toca apenas durante a execução, ao vivo.

8. **Timestamps em milissegundos** (`Date.now()`), e não em strings ISO. Isso simplifica os cálculos e continua atendendo ao modelo conceitual.

9. **Dados iniciais.** Nenhum temporizador é criado automaticamente. O formulário de criação já vem preenchido com 25/5/4/15 minutos.

---

## Verificação

- **Testes automatizados:** 67 testes (regras de sessão, validações, ordenação, persistência e fluxos de interface), executados com `npm test`.
- **Mutação de controle:** ao quebrar propositalmente o recálculo por timestamps (RN-07), três testes de domínio falharam, o que confirma a cobertura da regra.
- **Build e lint:** `npm run build` e `npm run lint` passam sem erros.
- **Navegador real (Chromium headless):** fluxo completo verificado (criar temporizador e tarefas, iniciar, pausar e retomar) sem erros de console. Layout confirmado em desktop (1366 px) e celular (390 px), sem rolagem horizontal.
- **Não verificado:** a qualidade do som do alerta e a experiência com leitores de tela. Recomenda-se um teste manual antes da entrega.

---

## Equipe e divisão de responsabilidades

> Preencher com os nomes reais da equipe antes da entrega.

| Papel | Integrante | Responsabilidades |
|-------|-----------|-------------------|
| Líder | [nome] | Coordenação, revisão de Pull Requests, README e entrega final |
| Desenvolvimento do domínio e persistência | [nome] | `src/dominio`, `src/persistencia`, regras RN-01 a RN-11 |
| Desenvolvimento da interface | [nome] | `src/componentes`, `App.tsx`, layout responsivo e acessibilidade |
| Testes e qualidade | [nome] | Suíte de testes, validação dos critérios de aceite (seção 8) e lint |
| Documentação e requisitos | [nome] | Matriz de rastreabilidade, README e validação contra o documento |

Observação: os membros podem acumular papéis conforme o tamanho da equipe (2 a 4 integrantes).

