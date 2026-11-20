# Pesquisa e Conclusões

Implementei um sistema de design tokenizado com CSS, isto é, utilizei variáveis de CSS com valores semânticos como --paper, --ink, --accent, --control-border. Isto possibilitou a troca rápida de temas (claro, escuro, sistema) sem duplicação de regras de CSS. Verifiquei os requisitos da WCAG 2.2:

O texto padrão deve ter contraste de pelo menos 4,5:1. Componentes da interface devem ter contraste de pelo menos 3:1 (1.4.11).

Verifiquei o contraste para cada par de cores através de um script de verificação. Em especial, a cor de "highlight" (vermelha) foi alterada para o modo "Escuro". O contraste com o background nesse modo tem que ser de pelo menos 4,64:1. Explorei algumas possibilidades de tornar a UI mais acessível:

aria-live="polite": para que leitores de tela possam ler as mensagens. focus-visible: contorno de 3 pixel quando elemento está em foco. prefers-reduced-motion: reduce: para desabilitar as animações. forced-colors: active: para suportar modos de high contrast do sistema. Cursor contextual: por exemplo, pointer para elementos que podem ser interagidos, text para campos de texto, not-allowed para estados desativados.

  

# Desafios e Soluções

## As principais dificuldades foram:

Sempre colocar mais informações para indicar o estado do objeto além da cor. Por exemplo, "em uso", "concluído", "cancelado", "alta prioridade". Cada estado foi sempre acompanhado de um rótulo textual para evitar que a informação seja dada exclusivamente pela cor ou pelas bordas. Tratar o foco inicial nas janelas de diálogo. Os leitores de tela devem indicar ao usuário qual diálogo foi aberto antes de pedir qualquer input. O foco agora é dado ao título do diálogo, não mais ao primeiro campo de input. Para isso, foi necessário retirar o autoFocus. Foi necessário tratar com cuidado as "regiões dinâmicas" (atributo aria-live). Se as notificações forem adicionadas a nós já presentes na árvore do DOM, o leitor de tela pode simplesmente ignorar a primeira mensagem. A solução foi usar um contêiner persistente para as notificações. Elas são enviadas via aria-live, dentro de uma lista de notificações. A barra de fundo usada no indicador de progresso teve sua taxa de contraste mantida em pelo menos 3:1. A "trilha" (track) é definida como a cor --borda-controle, e o preenchimento usa a cor --tinta (taxa de contraste 14:1). Foram corrigidos 25 hifens/travessões nos comentários do código. O temporizador tinha seu intervalo de atualização em 250ms. Este valor foi alterado para 1000ms. Entretanto, os cálculos de tempo que utilizam timestamps absolutos não foram afetados. Elementos chave da Implementação

### HTML semântico:

, , , , , , , // (parâmetros predefinidos), link \#conteudo (pular para o conteúdo).

### Folhas de Estilo:

Tokens; reset/base; cards; botões; rótulos; mensagens; temporizadores; padrões; tarefas; diálogos; banners; barras de progresso; classes úteis; media queries (mobile-first até 480px, duas colunas a partir de 960px; barra lateral fixa).

### Acessibilidade:

Resumo de erros, com foco, quando o formulário é enviado incorretamente; foco automaticamente dado ao título do diálogo quando este é aberto; touch targets com dimensão mínima de 44px; cabeçalhos em fonte editorial (serifa); "caderno de anotações"; verificações de taxa de contraste para os temas claro e escuro.

### Persistência de Dados:

O localStorage é lido dentro de blocos try/catch. Registros inválidos são descartados e logados. Se ocorrer corrupção de dados, o usuário é notificado (R-03, RNF-06).

### Implantação:

O arquivo netlify.toml foi utilizado para configurar a implantação na plataforma de hospedagem Netlify. Durante o processo de construção, o comando npm run build foi executado. A pasta dist foi usada para publicação, e os redirecionamentos foram gerenciados para aplicações do tipo SPA (SPA - single-page application). Satisfez o requisito de construir uma aplicação web funcional.
