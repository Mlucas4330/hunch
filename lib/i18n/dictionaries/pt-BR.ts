import type { Dictionary } from '@/lib/i18n/dictionaries/en'

export const ptBR: Dictionary = {
  metadata: {
    title: 'Hunch',
    description:
      'Transforme uma landing page em um diagnóstico medido, com testes A/B rankeados e baseados em concorrentes reais.',
    ogImageAlt: 'Hunch - diagnóstico de conversão rankeado para uma landing page',
    pages: {
      landing: {
        title: 'Da sugestão à prova de que funcionou',
        description:
          'Cole qualquer landing page e receba um diagnóstico medido, com as correções priorizadas e a copy já escrita. Depois coloque cada uma no ar e veja qual funcionou.'
      },
      signin: {
        title: 'Entrar',
        description: 'Entre no Hunch com o Google.'
      },
      dashboard: {
        title: 'Seus clientes',
        description:
          'Todas as landing pages de clientes que você analisou e os testes que cada uma gerou.'
      },
      analysis: {
        title: 'Suas ideias de teste',
        description: 'Hipóteses de teste A/B rankeadas e o playbook de fluxo desta landing page.'
      },
      analysisReport: {
        title: 'Diagnóstico de conversão',
        description: 'A versão para impressão desta análise de landing page.'
      },
      test: {
        title: 'Rodar um teste',
        description: 'Aprove o desafiante, defina a meta de conversão e lance o teste ao vivo.'
      },
      leads: {
        title: 'Leads da lista de espera',
        description: 'Leads capturados pelos relatórios públicos.'
      },
      reports: {
        title: 'Aberturas de relatório',
        description: 'Quais relatórios públicos foram abertos, e quando.'
      },
      report: {
        title: 'Plano de testes A/B para {host}',
        description:
          '{count} testes rankeados para aumentar a conversão de {host}, com o texto para rodar e o raciocínio por trás de cada um.'
      }
    }
  },

  common: {
    upgrade: 'Falar com a gente',
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
      page_structure: 'Estrutura da página',
      indexability: 'Indexação',
      metadata: 'Metadados',
      structured_data: 'Dados estruturados',
      ai_answerability: 'Legibilidade para IA'
    },
    market: {
      us: 'Estados Unidos',
      br: 'Brasil'
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
      pro: 'Pro'
    },
    leadSource: {
      report: 'Muro do relatório',
      contact: 'Pediu contato'
    }
  },

  nav: {
    homeAria: 'Início do Hunch',
    dashboard: 'Clientes',
    signIn: 'Entrar',
    signOut: 'Sair',
    account: 'Conta',
    languageAria: 'Idioma',
    menuAria: 'Abrir menu'
  },

  footer: {
    copyright: 'Copyright {year} Hunch. Todos os direitos reservados.',
    contact: 'Fale com a gente',
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp'
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
    eyebrow: 'Ferramenta de auditoria para quem vende CRO',
    headlineTop: 'Sugestão de melhoria todo mundo tem.',
    headlineBottom: 'Prova de que funcionou, quase ninguém.',
    lead: 'Cole a landing page do seu cliente. Em minutos você tem o diagnóstico medido e as correções priorizadas com a copy já escrita. Depois coloca cada uma no ar e volta com o número que prova qual funcionou.',
    cta: 'Rodar um relatório',
    howItWorksLink: 'Como funciona',

    sample: [
      {
        problem:
          'Seu H1 diz o que a empresa faz, e não por que o visitante deveria fechar a outra aba.',
        variant: 'Mexa na sua página de preços sem depender de designer.',
        evidence:
          'A Linear abre com o resultado que o fundador quer, não com a lista de funcionalidades.'
      },
      {
        problem: '"Cadastre-se" cobra compromisso antes de o visitante ver alguma vantagem.'
      },
      {
        problem: 'Nada acima da dobra mostra que outra empresa já comprou isso.'
      }
    ],

    readout: {
      domain: 'landing page',
      liveTest: 'Teste no ar',
      winner: 'Variante de título venceu',
      detail: 'Teste de 14 dias, {visitors} visitantes',
      lift: '+18%',
      significant: 'Significativo',
      why: 'Por quê'
    },

    reality: {
      eyebrow: 'Na prática',
      heading: 'O trabalho que fecha o contrato é o que você faz antes de alguém pagar.'
    },
    pains: [
      {
        headline: 'Um diagnóstico bem feito leva meio dia.',
        reality:
          'Ler a página, conferir o head, cronometrar o carregamento, olhar dois concorrentes. Depois repetir tudo no próximo prospect, que talvez nem responda.',
        answer:
          'Uma URL e alguns minutos. O diagnóstico volta contado na página dele, e opinião com número do lado deixa de ser questão de gosto.'
      },
      {
        headline: 'Sua entrega termina na ideia.',
        reality:
          'Você lista o que mudar, o cliente publica algumas, e três meses depois ninguém sabe dizer qual delas mexeu o ponteiro. Na renovação você volta com argumento, não com resultado.',
        answer:
          'Cada ideia daqui pode entrar no ar como teste na página do cliente e fechar com veredito: venceu, perdeu, ou não deu tráfego para dizer.'
      },
      {
        headline: 'Relatório com a marca dos outros não é entregável seu.',
        reality:
          'Você não manda para o seu cliente um documento que faz propaganda de fornecedor, e muito menos um que pede o e-mail dele para liberar o resto.',
        answer:
          'No plano pago o relatório sai sem marca nossa, sem muro e sem nada borrado. É seu para enviar.'
      }
    ],

    how: {
      eyebrow: 'Como funciona',
      heading: 'Primeiro o relatório ganha a reunião. Depois o teste segura o contrato.',
      intro: 'O relatório é o que coloca você na sala: um diagnóstico medido de uma página a que você nunca teve acesso. O teste no ar é o que mantém você lá depois que o trabalho é seu.'
    },
    tracks: [
      {
        label: 'Mande o relatório',
        note: 'Minutos, sem precisar de acesso',
        steps: [
          {
            label: 'Cole a URL dele',
            body: 'Qualquer landing page pública. A gente abre, mede e ainda estuda de dois a três concorrentes reais do mercado dele.'
          },
          {
            label: 'Leia o diagnóstico',
            body: 'Primeiro o que foi medido na página. Depois as correções priorizadas em fluxo, copy e descoberta, cada uma com o texto substituto já escrito. Se você adicionar um briefing do negócio, ele volta com os dados reais do cliente.'
          },
          {
            label: 'Envie como seu',
            body: 'Mande o link ou entregue a versão impressa. No plano pago não tem nada ali que diga o nosso nome.'
          }
        ]
      },
      {
        label: 'Prove o que funcionou',
        note: 'Depois do contrato',
        steps: [
          {
            label: 'Instale uma vez',
            body: 'Quando você já tem acesso ao site do cliente: uma linha de script, mais um atributo no botão que conta como conversão. Depois disso a copy muda daqui, sem novo deploy.'
          },
          {
            label: 'Escolha a janela',
            body: 'Escolha 7, 14 ou 30 dias. A significância é lida uma vez só, quando a janela fecha, então ninguém canta vencedor antes da hora.'
          },
          {
            label: 'Mostre o veredito',
            body: 'O teste fecha em ganho de conversão, significância estatística e uma recomendação direta. É com isso que você senta na conversa de renovação.'
          }
        ]
      }
    ],

    value: {
      eyebrow: 'O que você recebe',
      heading: 'Um relatório que aguenta ser questionado.'
    },
    proof: [
      {
        title: 'Medido, não chutado',
        body: 'O diagnóstico conta o que está na página: campos de formulário, CTAs acima da dobra, tempo de carregamento, imagens sem alt. Número que a gente tirou da página, nunca número que um modelo inventou.'
      },
      {
        title: 'A ideia já vem pronta para testar',
        body: 'Cada correção priorizada traz a copy substituta e o raciocínio por trás dela. Essa mesma copy vira um teste no ar na página do cliente, sem novo deploy, e fecha em veredito.'
      },
      {
        title: 'Seu para enviar',
        body: 'Relatório pago não tem logo nossa, não tem muro de e-mail e não tem nada borrado. Cole o link num e-mail ou entregue a versão impressa.'
      }
    ],

    contact: {
      eyebrow: 'Fale com a gente',
      heading: 'Conte quantas páginas você audita por mês.',
      body: 'A gente roda um relatório real numa página que você escolher e mostra quanto custa enviar com o seu nome. Sem papo de vendedor.',
      points: [
        'Relatório com o seu nome, não com o nosso',
        'Seu cliente nunca esbarra num muro de cadastro',
        'Um diagnóstico medido por página, nada de modelo pronto',
        'A gente responde no mesmo dia'
      ],
      form: {
        emailPlaceholder: 'voce@agencia.com',
        phonePlaceholder: 'Telefone (opcional)',
        join: 'Pedir um relatório',
        joining: 'Enviando...',
        done: 'Recebido. A gente responde nesse e-mail hoje.',
        error: 'Algo deu errado. Tente de novo.'
      }
    },

    finalCta: {
      heading: 'Escolha um prospect. Rode o relatório. Veja o que você teria mandado.'
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
    eyebrow: 'Clientes',
    title: 'Seus clientes',
    hintLabel: 'Como a análise funciona',
    hint: 'Cole a URL da landing page do seu cliente. O Hunch lê o texto, estuda concorrentes e gera ideias de teste A/B rankeadas. Adicione *detalhes do negócio* para o texto voltar pronto em vez de com [placeholders]. Nos planos pagos, cole URLs de concorrentes (*Modo concorrentes*) para embasar as ideias; análises gratuitas encontram concorrentes automaticamente.',
    subtitle: 'Cole a URL da landing page de um cliente para gerar o diagnóstico dele.',
    emptyTitle: 'Nenhum cliente ainda',
    emptyDescription:
      'Cole a URL da landing page de um cliente acima para rodar sua primeira análise.'
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
      'Para quem é o produto, os números reais (usuários, duração do teste grátis, preços) e o que o diferencia. É com isso que a copy volta pronta em vez de vir com placeholders.',
    competitorSummary: 'Modo concorrentes',
    competitorPaidOnly: '(Pro)',
    competitorHint: 'Cole até {max} landing pages de concorrentes para embasar as ideias.',
    competitorPlaceholder: 'https://um-concorrente.com',
    competitorLockedBefore: 'Embase as ideias nos concorrentes que você escolher.',
    competitorLockedAfter:
      'para liberar o Modo concorrentes. Análises gratuitas encontram concorrentes automaticamente.',
    errorInvalidUrl: 'Informe uma URL válida, incluindo https://',
    errorGeneric: 'Algo deu errado. Tente novamente.',
    errorLimitReached:
      'Você chegou ao limite do plano gratuito. Fale com a gente para continuar analisando.',
    errorUnsupportedUrl: 'Essa URL não é válida ou não é suportada.',
    errorScrapeFailed: 'Não conseguimos carregar essa página. Confira a URL e tente novamente.',
    errorAnalyzeFailed: 'Algo deu errado durante a análise. Tente novamente.'
  },

  usageBanner: {
    limitReached: 'Limite atingido',
    almostOut: 'Quase no limite',
    usageOf: 'de',
    used: 'análises usadas neste mês.',
    blockedNote: 'Fale com a gente para continuar analisando páginas.',
    remainingNote: 'Faltam {remaining} para você chegar ao limite do plano gratuito.'
  },

  history: {
    openAria: 'Abrir análise de {url}',
    deleteAria: 'Excluir análise de {url}'
  },

  analysis: {
    eyebrow: 'O que testar',
    title: 'Suas ideias de teste',
    hintLabel: 'Como usar esta tela',
    hint: 'Cada aba é um tipo de correção, ordenada pelo impacto provável. *Fluxo* e *SEO* são mudanças que alguém aplica à mão; *Copy* é o texto, e ali cada ideia já vem com a versão nova escrita. Quando você tiver acesso ao site e quiser provar uma mudança em vez de discutir, a aba *Teste A/B ao vivo* é onde se instala o snippet e roda um teste por vez.',
    backToDashboard: 'Voltar para clientes',
    benchmarkedAgainst: 'Ideias embasadas nestes concorrentes:',
    marketNote: '(mercado: {market})',
    copyFailed: 'Não foi possível copiar',
    deliverables: {
      eyebrow: 'Entregáveis',
      hintLabel: 'Qual dos dois enviar',
      hint: 'Esta análise gera dois documentos para você entregar, e são os mesmos achados em dois formatos. O *relatório interativo* é um link: seu cliente abre no navegador, circula pelas abas e consegue ver cada troca de texto renderizada na página dele. O *relatório em PDF* é a mesma análise achatada em uma página só, para o cliente que quer algo para imprimir, encaminhar ou anexar. Em um plano pago, nenhum dos dois leva o nosso nome.',
      interactiveTitle: 'Relatório interativo',
      interactiveBody: 'Uma página que seu cliente abre no navegador. Cada troca de texto pode ser vista na página real dele.',
      pdfTitle: 'Relatório em PDF',
      pdfShort: 'PDF',
      pdfBody: 'Os mesmos achados em uma página só, para imprimir ou anexar em um e-mail.',
      open: 'Abrir',
      copyLink: 'Copiar link'
    },
    tabs: {
      flow: 'Fluxo',
      copy: 'Copy',
      seo: 'SEO',
      ai: 'Encontrado por IA',
      tests: 'Teste A/B ao vivo'
    }
  },

  flow: {
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

  visibility: {
    eyebrow: 'Seja encontrado',
    title: 'Um buscador e uma IA conseguem ler esta página',
    hintLabel: 'O que esta seção verificou',
    hint: 'Isto vem do que a sua página *declara sobre si mesma*: título, descrição, dados estruturados e o que o robots.txt permite. Verificamos a página, *não* a sua posição em busca: nada aqui diz onde você aparece nem se alguma IA cita você hoje, apenas se a sua página entrega o que elas precisam para encontrar e citar você.',
    stepsLabel: 'Como implementar',
    evidenceLabel: 'Por quê'
  },

  seo: {
    eyebrow: 'Seja encontrado',
    title: 'O que um buscador consegue ler aqui',
    hintLabel: 'O que esta seção verificou',
    hint: 'Isto vem do que a sua página *declara sobre si mesma*: título, descrição, canonical, dados estruturados e o que o robots.txt permite. Verificamos a página, *não* a sua posição em busca: nada aqui diz onde você aparece nem quanto tráfego você recebe, apenas se a sua página entrega o que um crawler precisa para alcançar e ler você.',
    stepsLabel: 'Como implementar',
    evidenceLabel: 'Por quê'
  },

  ai: {
    eyebrow: 'Encontrado por IA',
    title: 'Uma IA consegue citar esta página',
    hintLabel: 'O que esta seção verificou',
    hint: 'Um assistente respondendo sobre a sua categoria precisa *ler uma resposta na sua página* para citar você. Isto é o que torna uma resposta encontrável: fatos escritos em texto em vez de presos dentro de uma imagem, e perguntas respondidas onde um modelo consegue ver. Verificamos a página, *não* o que algum modelo diz hoje - nada aqui diz se alguma IA cita você neste momento.',
    stepsLabel: 'Como implementar',
    evidenceLabel: 'Por quê'
  },

  readout: {
    eyebrow: 'Medido na página',
    title: 'O que encontramos',
    hintLabel: 'De onde vêm esses números',
    hint: 'Tudo aqui foi *contado na própria página* na hora em que a carregamos - nada é estimativa, média de mercado ou benchmark. Os tempos vêm de um data center com conexão boa, então são *o melhor cenário*: no celular o visitante espera mais que isso, nunca menos.',
    groups: {
      structure: 'A experiência de quem chega na página',
      metadata: 'O que a IA precisa está aqui?',
      visibility: 'O que um crawler de IA tem permissão de ler',
      load: 'A página está otimizada?'
    },
    score: {
      label: 'Saúde do que medimos',
      scale: '100 significa que todas as verificações desta página passaram. 0 significa que nenhuma passou.',
      method: 'Média das {count} verificações abaixo, cada uma contada na própria página: a que passa vale um ponto inteiro, a que fica no limite vale meio, a que falha não vale nada. A nota avalia só o que foi contado aqui, e não diz nada sobre quanto tráfego ou receita a página gera.'
    },
    findings: {
      form_fields: 'Campos no formulário de cadastro',
      no_social_signin: 'Login com Google ou GitHub',
      above_fold_ctas: 'CTAs acima da dobra',
      nav_links: 'Links do menu que tiram o visitante da página',
      no_faq: 'Dúvidas respondidas na página',
      no_testimonials: 'Depoimentos de clientes',
      word_count: 'Palavras na página',
      heading_count: 'Títulos e subtítulos na página',
      noindex: 'Bloqueada para buscadores',
      no_meta_description: 'Meta description',
      h1_count: 'Títulos H1',
      images_missing_alt: 'Imagens sem alt',
      no_structured_data: 'Dados estruturados',
      no_og_image: 'Imagem de compartilhamento',
      no_canonical: 'URL canonical',
      no_lang: 'Idioma declarado na página',
      internal_links: 'Links para outras páginas do site',
      term_in_title: 'Termo principal no title',
      term_in_h1: 'Termo principal no H1',
      term_in_meta_description: 'Termo principal na meta description',
      ai_crawlers_blocked: 'Crawlers de IA bloqueados no robots.txt',
      robots_blocks_all: 'Rastreamento permitido',
      no_sitemap: 'Sitemap declarado no robots.txt',
      ttfb: 'TTFB (tempo até o primeiro byte)',
      fcp: 'FCP (primeiro conteúdo a aparecer)',
      lcp: 'LCP (maior elemento a aparecer)',
      page_weight: 'Peso da página',
      request_count: 'Requisições de rede'
    },
    presence: {
      yes: 'Sim',
      no: 'Não'
    },
    delta: {
      up: '+{value}',
      down: '-{value}',
      gained: 'passou a ter',
      lost: 'deixou de ter'
    },
    trend: {
      title: 'Evolução ao longo do tempo',
      hint: 'Um ponto por medição desta página. Mostra o que mudou, não o que causou a mudança.'
    },
    atLeast: 'no mínimo',
    units: {
      seconds: '{value}s',
      megabytes: '{value} MB'
    },
    keywords: {
      title: 'Os termos que esta página mais repete',
      term: 'Termo',
      count: 'Vezes que aparece',
      surfaces: {
        inTitle: 'Title',
        inH1: 'H1',
        inMetaDescription: 'Meta description',
        inHeadings: 'Títulos'
      },
      hint: 'Contado no próprio texto da página. São as palavras em torno das quais ela foi escrita, não o que as pessoas buscam.'
    },
    comparison: {
      title: 'A página lado a lado com os concorrentes indicados',
      hint: 'Medido do mesmo jeito em todas elas, no mesmo tamanho de tela.',
      you: 'Esta página',
      metrics: {
        form_fields: 'Campos no formulário',
        social_signin: 'Login social',
        above_fold_ctas: 'CTAs acima da dobra',
        nav_links: 'Links do menu',
        word_count: 'Palavras na página',
        pricing: 'Preço na página',
        testimonials: 'Depoimentos',
        faq: 'FAQ',
        sticky_cta: 'CTA fixo',
        meta_description: 'Meta description',
        structured_data: 'Dados estruturados',
        lcp: 'LCP',
        page_weight: 'Peso da página'
      }
    },
    measure: {
      explain:
        'Esta análise foi gerada antes de começarmos a contar. Carregamos a página de novo e medimos: campos de formulário, CTAs acima da dobra, tempo de carregamento, imagens sem alt.',
      cta: 'Medir esta página',
      loading: 'Medindo a página...',
      hint: 'Leva cerca de {seconds} segundos. Abrimos a página do mesmo jeito que um visitante abre.',
      failed: 'Não conseguimos carregar a página desta vez. Nada foi alterado nesta análise.',
      retry: 'Tentar de novo',
      again: 'Medir de novo',
      againHint: 'Abrimos a página outra vez e acrescentamos um ponto à evolução. As correções e os testes não mudam.'
    }
  },

  hypothesisList: {
    manualSetup: 'Configuração manual',
    testThisFirst: 'Teste isto primeiro',
    recommendedChallenger: 'Desafiante recomendado',
    competitorEvidence: 'Do concorrente',
    placeholderWarning:
      'Contém [placeholders] - você vai substituí-los pelos seus dados reais ao configurar o teste.',
    viewTest: 'Ver teste',
    setUpTest: 'Configurar teste',
    backlog: {
      one: 'mais {count} ideia',
      other: 'mais {count} ideias'
    }
  },

  embedSnippet: {
    title: 'Instale o snippet de rastreamento',
    body: 'Passo um. Cole isto uma vez, logo antes da tag de fechamento do body da landing page. Ele aplica as variantes em andamento e envia os resultados de volta sozinho.',
    goalTitle: 'Passo dois: marque o que conta como conversão',
    goalBody: 'Adicione este attribute no elemento que o visitante clica ao converter, normalmente o seu call to action principal. Sem ele o snippet conta visitantes mas nunca um resultado, e nenhum teste pode ser lançado.',
    troubleshootTitle: 'Teste rodando mas sem registrar nada?',
    cspBody: 'Confira isto antes de qualquer outra coisa. A causa mais comum é um Content-Security-Policy na landing page: um header de segurança que lista quais domínios podem rodar scripts. O snippet vem de outro domínio, então uma policy restritiva bloqueia ele. Peça para quem cuida do site liberar esta origem nas duas diretivas abaixo.',
    cspBoth: 'As duas são necessárias. Só com a primeira, o snippet carrega e depois não reporta nada, em silêncio.',
    debugBody: 'Para ver o que o snippet está fazendo, adicione data-debug="1" na tag e abra o console do navegador na landing page. Ele conta o que encontrou, qual variante aplicou e o que enviou.'
  },

  testList: {
    eyebrow: 'Prove',
    title: 'Rodar um teste ao vivo',
    hintLabel: 'O que fica nesta aba',
    hint: 'Tudo sobre rodar um teste está aqui, porque é o passo que vem *depois* de você ter acesso ao site. Instale o snippet uma vez e rode um teste por vez: ele mostra o desafiante para metade dos visitantes, e quem decide o vencedor é o resultado, não a opinião de ninguém. Só entram aqui as ideias cujo texto cai em um elemento único - o resto sai à mão pelas outras abas.',
    empty: 'Nenhuma ideia desta análise cai em um elemento único, então não há nada para o snippet trocar. Aplique pelas outras abas, à mão.'
  },

  runTest: {
    eyebrow: 'Teste A/B ao vivo',
    hintLabel: 'Como rodar um teste funciona',
    hint: 'Seu texto atual é o *controle*. Escolha um *desafiante*, edite para o seu produto (troque qualquer [espaço reservado] entre colchetes por dados reais) e escolha por quanto tempo rodar. Ao clicar em *Lançar*, o snippet mostra o desafiante para metade dos visitantes e registra as conversões. Quando a janela termina, lemos o resultado uma vez e recomendamos um vencedor.',
    backToIdeas: 'Voltar às ideias',
    relaunch: 'Rodar outro teste'
  },

  testRunner: {
    controlTitle: 'Controle (seu texto atual)',
    challengerTitle: 'Desafiante a testar',
    variant: 'Variante {letter}',
    recommendedSuffix: ' (recomendada)',
    writingAlternates: 'Escrevendo alternativas...',
    placeholderWarning:
      'Este texto ainda tem [placeholders] como [duração do teste]. Substitua pelos seus dados reais antes de lançar, ou seus visitantes verão os colchetes.',
    goalTitle: 'O que conta como conversão',
    goalHelp:
      'Adicione este attribute no elemento que o visitante clica ao converter, normalmente o seu call to action principal. Um clique nele é uma conversão. Isso substitui o chute em um seletor CSS, que quebra em silêncio no próximo redesign da página.',
    goalMissing:
      'Esse attribute ainda não está na página, então este teste só conseguiria registrar visitantes e nunca um resultado. Adicione, publique a página, e então lance o teste.',
    testLength: 'Duração do teste',
    days: '{days} dias',
    launch: 'Lançar teste',
    launching: 'Lançando...',
    gatedBefore: 'Você já tem um teste rodando. Planos gratuitos rodam um por vez.',
    gatedAfter: 'para rodar mais.',
    manualTarget:
      'Esta ideia é de configuração manual: o texto dela não corresponde a um único elemento que possamos trocar automaticamente, então ela não roda como teste de texto ao vivo. Aplique o texto recomendado na sua página manualmente.',
    alreadyRunning:
      'Esta ideia já tem um teste ao vivo. Interrompa esse teste antes de lançar outro.',
    error: 'Algo deu errado ao lançar o teste.'
  },

  experimentPanel: {
    stop: 'Interromper',
    discard: 'Descartar',
    declareWinner: 'Declarar vencedora',
    recommendation: 'Recomendação',
    copyReport: 'Copiar relatório',
    downloadMd: 'Baixar .md',
    upgradeToExport: 'Fale com a gente para exportar',
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
    readyToTest: 'Prontas para testar no ar',
    topImpact: 'Maior impacto',
    generated: 'Gerado em',
    benchmarkedAgainst: 'Ideias embasadas nestes concorrentes',
    testThisFirst: 'Teste isto primeiro',
    problem: 'Problema',
    recommendation: 'Recomendação',
    current: 'Atual',
    changeTo: 'Trocar por',
    placeholderNote:
      'Contém [placeholders]. Substitua pelos seus dados reais antes de lançar.',
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
    previewOverflow:
      'Este texto não cabe no espaço que sua página dá para esse elemento, então a prévia mostra ele cortado. Encurte o texto, ou dê mais espaço ao elemento antes de publicar.',
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

  upgradePrompt: {
    eyebrow: 'Pro',
    title: 'Mande este relatório com o seu nome',
    body: 'No Pro o relatório sai sem marca nossa e sem muro de cadastro, então dá para entregar direto ao cliente. Junto vêm análises ilimitadas, modo concorrentes e exportação.',
    dismiss: 'Agora não',
    dismissAria: 'Dispensar aviso'
  },

  leads: {
    eyebrow: 'Admin',
    title: 'Leads da lista de espera',
    empty: 'Nenhum lead ainda. Eles chegam pelo muro de um relatório público ou pelo formulário de contato.',
    email: 'E-mail',
    source: 'Origem',
    phone: 'Telefone',
    fromReport: 'Do relatório',
    joined: 'Entrou em'
  },

  reports: {
    eyebrow: 'Admin',
    title: 'Aberturas de relatório',
    empty:
      'Nenhuma análise ainda. Um relatório começa a contar aberturas na primeira vez que alguém carrega o link dele.',
    page: 'Página',
    owner: 'Dono',
    views: 'Aberturas',
    lastOpened: 'Aberto pela última vez',
    never: 'Nunca'
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
