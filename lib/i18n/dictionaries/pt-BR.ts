import type { Dictionary } from '@/lib/i18n/dictionaries/en'

export const ptBR: Dictionary = {
  metadata: {
    title: 'Hunch',
    description:
      'Transforme sua landing page em hunches de teste A/B rankeadas e baseadas em concorrentes reais.',
    ogImageAlt: 'Hunch - hipoteses de teste A/B rankeadas para sua landing page',
    pages: {
      landing: {
        title: 'Descubra o que custa seus cadastros',
        description:
          'Cole a URL da sua landing page e receba os testes A/B que valem a pena rodar: rankeados, baseados em concorrentes reais e ja escritos.'
      },
      signin: {
        title: 'Entrar',
        description: 'Entre no Hunch com o Google.'
      },
      dashboard: {
        title: 'Suas analises',
        description: 'Todas as landing pages que voce analisou e os testes que cada uma gerou.'
      },
      analysis: {
        title: 'Suas ideias de teste',
        description:
          'Hipoteses de teste A/B rankeadas e o playbook de fluxo desta landing page.'
      },
      analysisReport: {
        title: 'Diagnostico de conversao',
        description: 'O diagnostico para impressao desta analise de landing page.'
      },
      test: {
        title: 'Rodar um teste',
        description:
          'Aprove o desafiante, defina a meta de conversao e lance o teste ao vivo.'
      },
      billing: {
        title: 'Planos e uso',
        description: 'Gerencie seu plano do Hunch e veja o uso deste mes.'
      },
      leads: {
        title: 'Leads da lista de espera',
        description: 'Leads capturados pelos relatorios publicos.'
      },
      report: {
        title: 'Plano de testes A/B para {host}',
        description:
          '{count} testes rankeados para aumentar a conversao de {host}, com o texto para rodar e o raciocinio por tras de cada um.'
      }
    }
  },

  common: {
    upgrade: 'Fazer upgrade',
    close: 'Fechar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    deleting: 'Excluindo',
    copy: 'Copiar',
    copied: 'Copiado',
    or: 'ou',
    none: '-'
  },

  labels: {
    section: {
      headline: 'Título',
      subheadline: 'Subtítulo',
      cta: 'CTA',
      social_proof: 'Prova social',
      pricing: 'Preços',
      features: 'Funcionalidades',
      hero_image: 'Imagem principal',
      navigation: 'Navegação',
      other: 'Outro'
    },
    flowCategory: {
      signup_friction: 'Atrito no cadastro',
      cta_placement: 'Posição do CTA',
      decision_load: 'Carga de decisão',
      objections: 'Objeções',
      trust: 'Confiança',
      pricing_clarity: 'Clareza de preços',
      page_structure: 'Estrutura da página'
    },
    hypothesisStatus: {
      pending: 'Pendente',
      testing: 'Em teste',
      completed: 'Concluída',
      skipped: 'Ignorada'
    },
    variantStatus: {
      proposed: 'Proposta',
      testing: 'Em teste',
      winner: 'Vencedora',
      rejected: 'Rejeitada'
    },
    experimentStatus: {
      running: 'Rodando',
      stopped: 'Interrompido',
      completed: 'Concluído'
    },
    experimentArm: {
      control: 'Controle',
      variant: 'Variante'
    },
    experimentRecommendation: {
      ship_variant: 'Publique a variante',
      keep_control: 'Mantenha o texto atual',
      inconclusive: 'Inconclusivo - tráfego insuficiente'
    },
    plan: {
      free: 'Gratuito',
      solo: 'Solo'
    }
  },

  nav: {
    homeAria: 'Início do Hunch',
    dashboard: 'Painel',
    billing: 'Assinatura',
    signIn: 'Entrar',
    signOut: 'Sair',
    account: 'Conta',
    languageAria: 'Idioma'
  },

  footer: {
    poweredBy: 'Feito por'
  },

  infoHint: {
    defaultLabel: 'Como esta etapa funciona'
  },

  score: {
    impact: 'Impacto',
    effort: 'Esforço',
    aria: '{label} {score} de 10',
    short: {
      impact: 'I',
      effort: 'E'
    }
  },

  landing: {
    eyebrow: 'Instrumento de conversão para micro-SaaS',
    headlineTop: 'Descubra o que custa seus cadastros.',
    headlineBottom: 'Prove a correção quando quiser.',
    lead: 'Cole sua URL. Receba os testes A/B que valem a pena, priorizados e já escritos.',
    cta: 'Analisar minha landing page',
    howItWorksLink: 'Como funciona',

    sample: [
      {
        problem:
          'Seu H1 diz o que você faz, não por que você ganha da aba que o visitante já tem aberta.',
        variant: 'Publique mudanças na sua página de preços sem esperar por um designer.',
        evidence: 'A Linear abre com o resultado que o fundador quer, não com a lista de recursos.'
      },
      {
        problem: '"Cadastre-se" pede compromisso antes de o visitante ver qualquer ganho.'
      },
      {
        problem: 'Nada acima da dobra mostra que outro fundador já confiou nisso.'
      }
    ],

    readout: {
      domain: 'landing page',
      liveTest: 'Teste ao vivo',
      winner: 'Variante de título vence',
      detail: 'Teste de 14 dias, {visitors} visitantes',
      lift: '+18%',
      significant: 'Significativo',
      why: 'Por quê'
    },

    reality: {
      eyebrow: 'A realidade',
      heading: 'O problema nunca foi esforço. Era saber onde apontá-lo.'
    },
    pains: [
      {
        headline: 'Seu tráfego é baixo demais para testar tudo.',
        reality:
          'Algumas centenas de visitantes por semana dão talvez um experimento por mês. Escolha o errado e você não aprende nada.',
        answer:
          'Cada hunch é rankeada pelo impacto previsto, então sua única tentativa cai onde move receita.'
      },
      {
        headline: 'Não existe time de growth. É você, às 23h.',
        reality:
          'Sem CRO, sem copywriter, sem backlog de experimentos. Só você e uma página que já leu mil vezes.',
        answer:
          'Cole a URL uma vez. Receba de cinco a oito testes escritos para você, com o texto da variante incluído.'
      },
      {
        headline: 'Você nunca sabe por onde começar.',
        reality:
          'Você sabe que conversão importa. Todo guia diz "é só testar". Nenhum diz o que testar primeiro.',
        answer:
          'O Hunch transforma a página em branco em um caminho ordenado: título, depois CTA, depois prova.'
      }
    ],

    how: {
      eyebrow: 'Como funciona',
      heading: 'Pegue o plano e vá. Ou fique e prove.',
      intro: 'Duas formas de usar o Hunch. Pegue o relatório: concorrentes reais pesquisados para você, mais testes priorizados com o texto da variante pronto para você aplicar. Ou cole uma linha de script e deixe o Hunch rodar o teste A/B ao vivo e medir o ganho.'
    },
    tracks: [
      {
        label: 'Receba o plano',
        note: 'Minutos, sem código',
        steps: [
          {
            label: 'Cole sua URL',
            body: 'Informe sua landing page no ar. O Hunch extrai o texto e estuda de dois a três concorrentes reais do seu mercado.'
          },
          {
            label: 'Receba hunches rankeadas',
            body: 'De cinco a oito testes A/B, ordenados por impacto, cada um com o texto da variante e o padrão do concorrente que ele usa.'
          },
          {
            label: 'Aplique ou compartilhe o relatório',
            body: 'Reescreva a página hoje mesmo, exporte o relatório ou envie o link compartilhável para quem cuida do texto.'
          }
        ]
      },
      {
        label: 'Prove ao vivo',
        note: 'Opcional',
        steps: [
          {
            label: 'Cole uma linha de script',
            body: 'Escolha uma hunch e cole uma única linha na sua página. O Hunch mostra a variante para metade dos visitantes, sem novo deploy nem mudanças de código.'
          },
          {
            label: 'Escolha a janela',
            body: 'Escolha 7, 14 ou 30 dias. A significância é lida uma única vez na linha de chegada, então você nunca persegue um falso vencedor.'
          },
          {
            label: 'Leia o veredito',
            body: 'O teste se encerra sozinho em um relatório: ganho de conversão, significância estatística e uma recomendação direta.'
          }
        ]
      }
    ],

    value: {
      eyebrow: 'O que você recebe',
      heading: 'Um plano para agir hoje. Prova quando você quiser.'
    },
    proof: [
      {
        title: 'Rankeado, não brainstormado',
        body: 'Cada hunch traz uma nota de impacto e esforço e o padrão do concorrente por trás dela, então a própria lista diz o que fazer primeiro.'
      },
      {
        title: 'Texto pronto, não prompts',
        body: 'Cada hunch vem com o texto da variante para colar direto na página. Adicione detalhes do negócio e ele volta com os seus números reais.'
      },
      {
        title: 'Prova quando você quiser',
        body: 'Transforme qualquer hunch em um teste ao vivo com prazo usando uma linha de script. Ele fecha em ganho de conversão, significância e uma recomendação direta.'
      }
    ],

    pricing: {
      eyebrow: 'Preços',
      heading: 'Comece grátis. Faça upgrade quando isso virar hábito.',
      mostPopular: 'Mais popular',
      perMonth: '/mês',
      startFree: 'Começar grátis',
      choose: 'Escolher {plan}',
      footnote: 'Cancele quando quiser'
    },
    plans: {
      free: {
        line: 'Receba um relatório completo e rankeado da sua própria página.',
        features: [
          '{limit} relatórios completos / mês',
          'Hunches rankeadas com texto da variante',
          'Link compartilhável do relatório',
          '1 teste ao vivo por vez'
        ]
      },
      solo: {
        line: 'Para o fundador que publica toda semana.',
        features: [
          'Relatórios ilimitados',
          'Histórico completo, exportação em markdown',
          'Modo concorrentes',
          'Testes ao vivo ilimitados'
        ]
      }
    },

    finalCta: {
      heading: 'Pare de reler o seu próprio texto. Comece com uma hunch.'
    }
  },

  signIn: {
    title: 'Entrar',
    description: 'Continue com sua conta Google',
    google: 'Continuar com o Google',
    adminEmail: 'E-mail do admin',
    password: 'Senha',
    invalidCredentials: 'Credenciais inválidas',
    adminSubmit: 'Entrar como admin'
  },

  dashboard: {
    eyebrow: 'Painel',
    title: 'Suas análises',
    hintLabel: 'Como a análise funciona',
    hint: 'Cole a URL da sua landing page no ar. O Hunch lê o texto, estuda concorrentes e gera ideias de teste A/B rankeadas. Adicione *detalhes do negócio* para o texto voltar pronto em vez de com [espaços reservados]. Nos planos pagos, cole URLs de concorrentes (*Modo concorrentes*) para embasar as ideias; análises gratuitas encontram concorrentes automaticamente.',
    subtitle: 'Cole a URL de uma landing page para gerar hipóteses de teste A/B rankeadas.',
    emptyTitle: 'Nenhuma análise ainda',
    emptyDescription: 'Cole a URL de uma landing page acima para rodar sua primeira análise.'
  },

  urlForm: {
    phases: [
      'Lendo sua página...',
      'Pesquisando concorrentes...',
      'Escrevendo suas ideias de teste...',
      'Salvando resultados...'
    ],
    urlPlaceholder: 'https://sua-landing-page.com',
    analyze: 'Analisar',
    analyzing: 'Analisando...',
    waitNote:
      'Isso costuma levar de 2 a 3 minutos. Mantenha esta aba aberta enquanto lemos a página, estudamos concorrentes e escrevemos seus testes.',
    briefSummary: 'Adicionar detalhes do negócio (opcional)',
    briefPlaceholder:
      'Para quem é, seus números reais (usuários, duração do teste grátis, preços) e o que te diferencia. Usamos isso para escrever textos prontos em vez de espaços reservados.',
    competitorSummary: 'Modo concorrentes',
    competitorPaidOnly: '(Solo)',
    competitorHint: 'Cole até {max} landing pages de concorrentes para embasar suas hunches.',
    competitorPlaceholder: 'https://um-concorrente.com',
    competitorLockedBefore: 'Embase suas hunches nos concorrentes que você escolher.',
    competitorLockedAfter:
      'para liberar o Modo concorrentes. Análises gratuitas encontram concorrentes automaticamente.',
    errorInvalidUrl: 'Informe uma URL válida, incluindo https://',
    errorGeneric: 'Algo deu errado. Tente novamente.',
    errorLimitReached:
      'Você atingiu o limite do plano gratuito. Faça upgrade para continuar analisando.',
    errorUnsupportedUrl: 'Essa URL não é válida ou não é suportada.',
    errorScrapeFailed: 'Não conseguimos carregar essa página. Confira a URL e tente novamente.',
    errorAnalyzeFailed: 'Algo deu errado durante a análise. Tente novamente.'
  },

  usageBanner: {
    limitReached: 'Limite atingido',
    almostOut: 'Quase no limite',
    used: 'análises usadas neste mês.',
    blockedNote: 'Faça upgrade para continuar analisando páginas.',
    remainingNote: 'Faltam {remaining} até você atingir o limite gratuito.'
  },

  history: {
    openAria: 'Abrir análise de {url}',
    deleteAria: 'Excluir análise de {url}'
  },

  analysis: {
    eyebrow: 'O que testar',
    title: 'Suas ideias de teste',
    hintLabel: 'Como usar esta tela',
    hint: 'Cada card é uma ideia de teste, rankeada pelo impacto provável. Para cada uma a IA recomenda o *desafiante* mais forte para enfrentar seu texto atual. Escolha uma e clique em *Configurar teste* - você roda um teste por vez, e os resultados ao vivo (não o seu palpite) decidem o vencedor. Instale o snippet uma vez e todos os testes rodam por trás dele.',
    report: 'Relatório',
    backToDashboard: 'Voltar ao painel',
    benchmarkedAgainst: 'Comparado com:',
    copyReportLink: 'Copiar link do relatório'
  },

  playbook: {
    eyebrow: 'Ajuste o fluxo',
    title: 'Antes de testar as palavras',
    hintLabel: 'Por que isto não tem botão de teste',
    hint: 'Isto muda a *estrutura* da sua página, não uma linha de texto, então não há nada para o snippet trocar nem para testar em A/B. Implemente na mão: costuma dar mais retorno do que qualquer mudança de texto, e deixa os testes de copy abaixo mais fáceis de ler.',
    stepsLabel: 'Como implementar',
    evidenceLabel: 'Por quê',
    count: {
      one: '{count} ajuste de fluxo',
      other: '{count} ajustes de fluxo'
    }
  },

  hypothesisList: {
    manualSetup: 'Configuração manual',
    testThisFirst: 'Teste isto primeiro',
    recommendedChallenger: 'Desafiante recomendado',
    placeholderWarning:
      'Contém [espaços reservados] - você vai substituí-los pelos seus dados reais ao configurar o teste.',
    viewTest: 'Ver teste',
    setUpTest: 'Configurar teste',
    sortLabel: 'Ordenar',
    sort: {
      impact: 'Impacto',
      effort: 'Esforço',
      quickWins: 'Ganhos rápidos'
    },
    filterLabel: 'Mostrar',
    filter: {
      all: 'Tudo',
      auto: 'Automático',
      manual: 'Manual',
      hideCompleted: 'Ocultar concluídos'
    },
    noMatches: 'Nenhuma ideia corresponde a estes filtros.',
    resetFilters: 'Limpar filtros',
    backlog: {
      one: 'mais {count} ideia',
      other: 'mais {count} ideias'
    }
  },

  embedSnippet: {
    title: 'Instale o snippet de rastreamento',
    body: 'Cole isto uma vez, logo antes da tag de fechamento do body da sua landing page. Ele aplica as variantes em andamento e reporta os resultados automaticamente.'
  },

  runTest: {
    eyebrow: 'Rodar um teste',
    hintLabel: 'Como rodar um teste funciona',
    hint: 'Seu texto atual é o *controle*. Escolha um *desafiante*, edite para o seu produto (troque qualquer [espaço reservado] entre colchetes por dados reais) e escolha por quanto tempo rodar. Ao clicar em *Lançar*, o snippet mostra o desafiante para metade dos visitantes e registra as conversões. Quando a janela termina, lemos o resultado uma vez e recomendamos um vencedor.',
    backToIdeas: 'Voltar às ideias'
  },

  testRunner: {
    controlTitle: 'Controle (seu texto atual)',
    challengerTitle: 'Desafiante a testar',
    variant: 'Variante {letter}',
    recommendedSuffix: ' (recomendada)',
    writingAlternates: 'Escrevendo alternativas...',
    placeholderWarning:
      'Este texto ainda tem [espaços reservados] como [duração do teste]. Substitua pelos seus dados reais antes de lançar, ou seus visitantes verão os colchetes.',
    goalTitle: 'O que conta como conversão',
    goalPlaceholder: 'a.cta',
    goalHelp:
      'Um clique neste elemento é uma conversão. Escolha o botão que seus visitantes clicam ao converter, ou cole o seu próprio seletor CSS.',
    goalWarning:
      'Sem uma meta, este teste registra visitantes mas nunca conversões, então nunca produz um resultado.',
    testLength: 'Duração do teste',
    days: '{days} dias',
    launch: 'Lançar teste',
    launching: 'Lançando...',
    gatedBefore: 'Você já tem um teste rodando. Planos gratuitos rodam um por vez.',
    gatedAfter: 'para rodar mais.',
    manualTarget:
      'Esta ideia é de configuração manual: o texto dela não corresponde a um único elemento que possamos trocar automaticamente, então ela não roda como teste de texto ao vivo. Aplique o texto recomendado na sua página manualmente.',
    error: 'Algo deu errado ao lançar o teste.'
  },

  experimentPanel: {
    stop: 'Interromper',
    discard: 'Descartar',
    declareWinner: 'Declarar vencedora',
    recommendation: 'Recomendação',
    copyReport: 'Copiar relatório',
    downloadMd: 'Baixar .md',
    upgradeToExport: 'Faça upgrade para exportar',
    noGoal:
      'Nenhuma meta de conversão definida, então nenhuma conversão está sendo registrada. Interrompa este teste e relance com uma meta para obter um resultado.',
    notEnoughData: 'Dados insuficientes por enquanto.',
    finalizing: 'Finalizando...',
    endsIn: { one: 'Termina em {days} dia', other: 'Termina em {days} dias' },
    lift: 'de ganho',
    drop: 'de queda',
    magnitude: '{value}% {direction}',
    significant: 'Significativo: {magnitude} (p={pValue}).',
    notSignificant: '{magnitude} até agora, ainda não significativo (p={pValue}).'
  },

  report: {
    backToTestIdeas: 'Voltar às ideias de teste',
    printHint: 'Pressione Ctrl ou Cmd + P para salvar em PDF',
    teardown: 'Análise de conversão',
    plan: 'Plano de teste A/B',
    landingPageAnalyzed: 'Landing page analisada',
    heading: '{count} testes para elevar sua conversão, rankeados por impacto.',
    testsFound: 'Testes encontrados',
    quickWins: 'Ganhos rápidos',
    topImpact: 'Maior impacto',
    generated: 'Gerado em',
    benchmarkedAgainst: 'Comparado com',
    testThisFirst: 'Teste isto primeiro',
    problem: 'Problema',
    recommendation: 'Recomendação',
    current: 'Atual',
    changeTo: 'Trocar por',
    placeholderNote:
      'Contém [espaços reservados]. Substitua pelos seus dados reais antes de lançar.',
    whyThisWorks: 'Por que isso funciona',
    manualSetup: 'Configuração manual',
    manualSetupBody:
      'Esta mudança toca uma seção que não é uma troca de texto de linha única, então a prévia no contexto não está disponível. Aplique o texto recomendado manualmente.',
    appliedToYourPage: 'Aplicado à sua página',
    previewAlt: 'Variante aplicada à landing page',
    previewCta: 'Veja como fica na sua página',
    previewHint:
      'Carregamos sua página real com este texto no lugar. Leva cerca de {seconds} segundos.',
    previewLoading: 'Renderizando sua página...',
    previewUnavailable:
      'Não conseguimos renderizar sua página agora. O texto recomendado acima continua valendo.',
    previewRetry: 'Tentar de novo',
    footerQuestion: 'Quer medir isso ao vivo na sua página?',
    generatedBy: 'Gerado pelo Hunch'
  },

  waitlist: {
    seeMore: 'Ver mais',
    heading: {
      one: 'Mais {count} teste de alto impacto está pronto',
      other: 'Mais {count} testes de alto impacto estão prontos'
    },
    body: 'Entre na lista de espera para liberar a análise completa, o texto recomendado para cada seção e testes A/B ao vivo na sua página.',
    done: 'Você está na lista. Entraremos em contato.',
    emailPlaceholder: 'voce@empresa.com',
    phonePlaceholder: 'Telefone (opcional)',
    join: 'Entrar na lista de espera',
    joining: 'Entrando...',
    error: 'Algo deu errado. Tente novamente.'
  },

  billing: {
    eyebrow: 'Assinatura',
    title: 'Planos e uso',
    usageCounter: 'análises usadas neste mês',
    usageOf: 'de',
    perMonth: '/mês',
    manageBilling: 'Gerenciar assinatura',
    currentPlan: 'Plano atual',
    upgradeTo: 'Fazer upgrade para {plan}',
    closeCheckoutAria: 'Fechar checkout'
  },

  leads: {
    eyebrow: 'Admin',
    title: 'Leads da lista de espera',
    empty: 'Nenhum lead ainda. Eles chegam quando alguém envia o formulário em um relatório público.',
    email: 'E-mail',
    phone: 'Telefone',
    fromReport: 'Do relatório',
    joined: 'Entrou em'
  },

  export: {
    filename: 'relatorio-teste-ab.md',
    title: 'Relatório de teste A/B',
    source: 'Origem',
    section: 'Seção',
    duration: 'Duração',
    days: 'dias',
    recommendation: 'Recomendação',
    problem: 'Problema',
    result: 'Resultado',
    arm: 'Braço',
    copy: 'Texto',
    conversions: 'Conversões / Visitantes',
    rate: 'Taxa',
    uplift: 'Ganho',
    pValue: 'valor-p',
    notAvailable: 'n/d'
  }
}
