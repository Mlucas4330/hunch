import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import { ptBrBlog } from '@/lib/i18n/dictionaries/pt-BR.blog'

export const ptBR: Dictionary = {
  metadata: {
    title: 'Hunch',
    description:
      'Auditoria de landing page para agências: notas do Google PageSpeed Insights, acesso de crawlers de IA e os erros de estrutura, copy, SEO e visibilidade para IA.',
    ogImageAlt: 'Hunch - auditoria de landing page',
    reportOgImageAlt: 'Auditoria de landing page',
    pages: {
      settings: {
        title: 'Configurações',
        description: 'A marca que os seus relatórios carregam e o plano da sua conta.'
      },
      landing: {
        title: 'Auditoria de landing page para agências',
        description:
          'Cole a URL do cliente e mande um relatório por link: nota do Google PageSpeed Insights, acesso dos crawlers de IA e os erros de IA, SEO, estrutura e copy.'
      },
      signin: {
        title: 'Entrar',
        description: 'Entre no Hunch.'
      },
      blog: {
        title: 'Blog',
        description:
          'O que uma máquina lê da sua landing page, por que a copy é a parte que argumenta e o que muda agora que as pessoas perguntam para um assistente em vez de buscar.'
      },
      dashboard: {
        title: 'Suas páginas',
        description: 'Todas as landing pages que você auditou e o relatório que cada uma gerou.'
      },
      bulk: {
        title: 'Auditar uma lista de páginas',
        description: 'Cole uma lista de URLs e receba um relatório para cada uma delas.'
      },
      admin: {
        title: 'Contas',
        description: 'Defina a cota mensal de cada conta.'
      },
      privacy: {
        title: 'Política de privacidade',
        description: 'O que o Hunch guarda das páginas auditadas e da sua conta, e com quem divide.'
      },
      report: {
        title: 'Auditoria da landing page de {host}',
        description: '{count} erros encontrados em {host}, com as notas do PageSpeed Insights e o motivo de cada um.'
      }
    }
  },

  common: {
    close: 'Fechar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    deleting: 'Excluindo',
    copy: 'Copiar',
    copied: 'Copiado',
    or: 'ou',
    none: '-',
    loading: 'Carregando'
  },

  errors: {
    crashed: {
      title: 'Esta página não carregou',
      body: 'Alguma coisa quebrou enquanto montávamos esta página. Não foi nada que você fez e nada foi perdido.',
      retry: 'Tentar de novo'
    },
    notFound: {
      title: 'Não tem nada neste link',
      body: 'O endereço pode estar incompleto, ou pode nunca ter apontado para lugar nenhum. Links de relatório são longos, então confira se ele foi copiado inteiro.',
      home: 'Ir para a página inicial'
    }
  },

  labels: {
    // Lido do impacto, nunca armazenado. Veja lib/constants.ts.
    severity: {
      critical: 'Crítico',
      medium: 'Médio',
      low: 'Leve'
    },
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
      mobile: 'Celular',
      performance: 'Performance',
      distinctiveness: 'Diferenciação',
      indexability: 'Indexação',
      metadata: 'Metadados',
      structured_data: 'Dados estruturados',
      ai_answerability: 'Legibilidade para IA',
      site_health: 'Saúde do site',
      backlinks: 'Backlinks',
      rankings: 'Rankings'
    },
    market: {
      us: 'Estados Unidos',
      br: 'Brasil'
    }
  },

  nav: {
    homeAria: 'Início do Hunch',
    blog: 'Blog',
    dashboard: 'Minhas páginas',
    bulk: 'Em lote',
    bulkReady: 'Pronto',
    settings: 'Configurações',
    admin: 'Admin',
    signIn: 'Entrar',
    signOut: 'Sair',
    account: 'Conta',
    languageAria: 'Idioma',
    menuAria: 'Abrir menu',
    themeAria: 'Tema de cor',
    theme: {
      light: 'Claro',
      dark: 'Escuro'
    }
  },

  footer: {
    copyright: 'Copyright {year} Hunch. Todos os direitos reservados.',
    privacy: 'Privacidade',
    email: 'Mandar e-mail para {address}',
    whatsapp: 'WhatsApp'
  },

  settings: {
    eyebrow: 'Conta',
    title: 'Configurações',
    brandTitle: 'Sua marca',
    hintLabel: 'Onde a sua marca aparece',
    hint: 'Com um logo ou um nome salvo aqui, os relatórios que você manda saem *com a sua marca no lugar da nossa*: no topo do relatório que o cliente abre, no card de prévia quando o link é colado no WhatsApp ou no e-mail e no título da aba do navegador.',
    nameLabel: 'Nome da agência',
    namePlaceholder: 'Sua agência',
    nameHint: 'Aparece quando não há logo e no card de prévia quando o link é compartilhado.',
    logoLabel: 'Logo',
    logoHint: 'PNG ou JPEG, até {kb} KB. Aparece no topo de todo relatório.',
    logoRemove: 'Remover o logo',
    save: 'Salvar',
    saving: 'Salvando...',
    saved: 'Salvo',
    error: 'Não deu para salvar. Confira o arquivo e tente de novo.',
    errorLogoTooLarge: 'Esse arquivo passa de {kb} KB. Exporte menor e tente de novo.',
    errorUnsupportedLogo: 'Esse arquivo não é PNG nem JPEG.',
    errorNameTooLong: 'O nome pode ter até {max} caracteres.',
    errorStorage: 'O envio de logo não está disponível agora. Tente de novo mais tarde.',
    subscription: {
      title: 'Sua assinatura',
      active: 'Você está no {tier}.',
      activeUntil: 'Você está no {tier}, com renovação em {date}.',
      cancel: 'Cancelar assinatura',
      confirmCancel: 'Sim, cancelar',
      keep: 'Manter',
      cancelling: 'Cancelando...',
      cancelFailed: 'Não deu para cancelar. Tente de novo em instantes.'
    }
  },

  landing: {
    eyebrow: 'Para agências',
    headlineTop: 'Mostre ao seu prospect por que a landing page dele perde cliente.',
    headlineBottom: 'Num relatório com a marca da sua agência.',
    lead: 'Cole a URL e receba os erros de copy, estrutura, SEO e leitura por IA, com a sua marca no relatório.',
    actions: {
      whatsapp: 'Falar no WhatsApp',
      whatsappMessage: 'Oi! Tenho uma agência e quero ver um relatório do Hunch para um cliente meu.',
      sample: 'Ver relatório de exemplo',
      contact: 'Entrar em contato',
      signIn: 'Entrar'
    },
    preview: {
      label: 'O relatório, seção por seção'
    },
    how: {
      heading: 'Três passos, e nenhum deles pede acesso ao site do cliente.',
      steps: [
        {
          title: 'Cole a URL do cliente',
          body: 'Sem instalar script e sem acesso ao código. Dá para informar uma segunda página para comparar.'
        },
        {
          title: 'Receba o relatório',
          body: 'O PageSpeed Insights mede a página, a gente confere o robots.txt e um modelo lista os erros de IA, SEO, estrutura e copy.'
        },
        {
          title: 'Mande o link',
          body: 'O relatório abre sem login. Quando a página mudar, rode de novo e as listas são reescritas no mesmo link.'
        }
      ]
    },
    ai: {
      heading: 'A IA é o novo Google, e ela nunca abre a página num navegador.',
      body: 'Cada vez mais gente pergunta para um assistente em vez de buscar. O relatório começa pelo que um modelo consegue ler e citar na página, a parte que as ferramentas de SEO costumam deixar de fora.',
      points: [
        {
          title: 'Quem pode ler o site',
          body: 'Quais crawlers de IA o robots.txt bloqueia, se ele bloqueia tudo e se declara um sitemap.'
        },
        {
          title: 'O que um modelo consegue citar',
          body: 'Fatos escritos em texto, e não presos numa imagem ou num script. Cada erro diz o que falta e por quê.'
        },
        {
          title: 'O que a página declara',
          body: 'Title, description, dados estruturados e alt text, lidos junto com as auditorias de SEO do PageSpeed Insights.'
        }
      ],
      link: 'Ler: a IA é o novo Google?'
    },
    report: {
      heading: 'O que cada relatório traz',
      errors: {
        title: 'Quatro listas de erros',
        body: 'IA, SEO, estrutura e copy. Cada erro diz o que está errado na página e por que isso é um problema, e vira um item que a sua agência pode cobrar para corrigir.'
      },
      prospecting: {
        title: 'Abra toda reunião com o diagnóstico do lead',
        body: 'Rode a página do prospect antes da primeira conversa e chegue mostrando o que está errado, em vez de perguntar o que ele precisa.'
      },
      score: {
        title: 'A nota do Google PageSpeed',
        body: 'As quatro categorias do Lighthouse no mobile e os visitantes reais do Chrome, quando o Google tem dados suficientes.'
      },
      compare: {
        title: 'Uma página para comparar',
        body: 'Informe a página de um concorrente e as notas dela aparecem ao lado das do cliente.'
      },
      history: {
        title: 'Rodar de novo',
        body: 'Cada rodada mede a página outra vez e reescreve as listas, e você vê como a nota mudou.'
      },
      link: {
        title: 'Um link para o cliente',
        body: 'O relatório abre sem conta. O seu cliente lê a mesma página que você.'
      }
    },
    pricing: {
      heading: 'Quanto custa',
      recommended: 'O mais escolhido',
      price: 'R$ {value}/mês',
      quota: '{count} rodadas por mês',
      subscribe: 'Assinar',
      subscribeSignedOut: 'Entre para assinar',
      cardLoading: 'Carregando o formulário do cartão...',
      cardSubmit: 'Assinar',
      subscribed: 'Assinatura confirmada. As rodadas já estão na sua conta.',
      cardRefused: 'O cartão foi recusado. Confira os dados ou use outro.',
      subscribeFailed: 'Não deu certo. Tente de novo em instantes.',
      note: 'Se a cota acabar antes do mês, você sobe de faixa. Uma rodada que falha não conta.',
      plans: {
        studio: {
          name: 'Studio',
          body: 'Três a cinco clientes, e ainda sobra rodada para auditar um prospect antes de apresentar a proposta.',
          features: [
            'Relatório com a marca da sua agência',
            'Link que abre sem login',
            'Uma página concorrente para comparar'
          ]
        },
        agency: {
          name: 'Agência',
          body: 'Dez a vinte clientes auditados todo mês, e o resto da cota vai para prospecção.',
          features: ['Tudo do Studio', 'Widget para o site da agência (em breve)']
        },
        network: {
          name: 'Rede',
          body: 'Um relatório por dia, ou um time de vendas que abre toda conversa com um.',
          features: ['Tudo do plano Agência', 'Widget para o site da agência (em breve)']
        }
      }
    },
    faq: {
      heading: 'Perguntas frequentes',
      items: [
        {
          question: 'Como funciona a assinatura?',
          answer: 'Você fecha o plano com a gente por e-mail e a sua conta recebe uma cota mensal de análises. Uma análise nova usa uma, e cada "Rodar de novo" também. Uma rodada que falha não conta, e se a cota acabar antes do mês, você sobe de faixa.'
        },
        {
          question: 'O meu cliente precisa de conta para ver o relatório?',
          answer: 'Não. O relatório abre por um link que só quem recebe conhece. Rodar de novo e o histórico da nota ficam com a sua conta.'
        },
        {
          question: 'Vocês precisam de acesso ao site ou ao código do cliente?',
          answer: 'Não. A gente abre a página pública do jeito que qualquer visitante abre, sem instalar nada, sem script e sem mexer em DNS.'
        },
        {
          question: 'O relatório escreve as correções?',
          answer: 'Não, e isso é de propósito. Cada erro diz o que está errado na página e por quê, sem texto pronto nem passo a passo. Assim cada erro vira um item que a sua agência pode cobrar para corrigir, em vez de um trabalho que o relatório já entregou de graça.'
        },
        {
          question: 'De onde vêm os números?',
          answer: 'A nota e as auditorias vêm do Google PageSpeed Insights, numa execução mobile. O acesso dos crawlers de IA vem do robots.txt do site. As listas de erros são escritas por um modelo a partir da página e dessas medições.'
        },
        {
          question: 'O relatório sai com a marca da minha agência?',
          answer: 'Sim. Em Sua marca você envia o logo e o nome da agência, e os relatórios que você manda saem com eles no lugar do Hunch, inclusive no card de prévia e no título da aba.'
        },
        {
          question: 'O que vocês guardam?',
          answer: 'As medições de cada rodada e as listas de erros, para o relatório continuar no ar e mostrar como a nota mudou. Os detalhes estão na política de privacidade.'
        }
      ]
    },
    finalCta: {
      heading: 'Quer ver o relatório de um cliente seu?'
    }
  },

  infoHint: {
    defaultLabel: 'Como esta etapa funciona'
  },

  score: {
    impact: 'Impacto',
    aria: '{label} {score} de 10',
    hintLabel: 'O que significa a nota de impacto',
    hint: 'O quanto este erro pesa na página *em relação aos outros desta análise*, de 1 a 10. É o que ordena a lista: comece de cima. Escrito por um modelo, não contado.',
    short: {
      impact: 'I'
    }
  },

  privacy: {
    eyebrow: 'Privacidade',
    heading: 'Política de privacidade',
    updated: 'Última atualização: {date}',
    intro: 'O que a gente guarda, por quanto tempo e com quem divide.',
    sections: [
      {
        title: 'Quem é o responsável',
        body: [
          'O Hunch é operado por Lucas Medeiros, pessoa física. Para qualquer pedido sobre os seus dados, escreva para {email} ou use o WhatsApp no rodapé desta página.'
        ]
      },
      {
        title: 'O que a gente não faz',
        body: [
          'Não tem script de analytics, gerenciador de tags, pixel de anúncio nem ferramenta de comportamento neste site. A gente não vende e não aluga os seus dados.'
        ]
      },
      {
        title: 'As páginas que você audita',
        body: [
          'A gente abre a URL que você enviou num navegador nosso, mede a página, envia a URL ao Google PageSpeed Insights e guarda os resultados para o relatório continuar funcionando e para uma medição futura mostrar o que mudou.',
          'O relatório é acessível por uma chave no próprio link. Quem tiver o link vê o relatório, então trate ele como você trataria qualquer link privado.'
        ]
      },
      {
        title: 'A sua conta',
        body: [
          'Se você entrar, guardamos o e-mail, o nome e a foto que o Google ou o GitHub devolvem, e a cota mensal definida para a sua conta. A gente só aceita e-mail que o provedor confirma como verificado, e nunca guarda senha.',
          'Se você configurar a sua marca, guardamos também o nome da agência e o logo que você enviar. O logo fica num endereço público, porque aparece no relatório para quem tiver o link.',
          'A sua assinatura é cobrada fora deste site. Nenhum dado de pagamento passa por aqui.'
        ]
      },
      {
        title: 'Cookies',
        body: [
          'O da sua sessão, que mantém você logado, e as suas preferências de idioma e de tema. Nenhum é de terceiro.'
        ]
      },
      {
        title: 'Com quem os dados são compartilhados',
        body: [
          'A Anthropic recebe o conteúdo da página auditada, que é o que permite escrever as listas de erros. O Google recebe a URL da página auditada para rodar o PageSpeed Insights nela. A infraestrutura onde o produto roda hospeda o banco e a aplicação.',
          'Ninguém mais recebe nada.'
        ]
      },
      {
        title: 'Os seus direitos',
        body: [
          'Pela LGPD você pode pedir acesso aos seus dados, correção, exclusão e portabilidade.',
          'É só pedir por {email} ou pelo WhatsApp que está no rodapé desta página.'
        ]
      },
      {
        title: 'Mudanças nesta política',
        body: ['Quando algo aqui mudar, a data no topo muda junto.']
      }
    ]
  },

  signIn: {
    title: 'Entrar',
    description: 'Continue com sua conta de trabalho',
    google: 'Continuar com o Google',
    github: 'Continuar com o GitHub',
    adminEmail: 'E-mail do admin',
    password: 'Senha',
    invalidCredentials: 'Credenciais inválidas',
    adminSubmit: 'Entrar como admin'
  },

  admin: {
    eyebrow: 'Operação',
    accounts: {
      title: 'Contas',
      subtitle: 'Defina quantas análises uma conta pode rodar a cada mês. O endereço não precisa ter entrado ainda: a cota fica esperando por ele.',
      emailLabel: 'Conta',
      emailPlaceholder: 'alguem@agencia.com',
      quotaLabel: 'Análises por mês',
      presetsAria: 'A cota que cada faixa carrega',
      submit: 'Salvar',
      result: {
        saved: 'Salvo.',
        invalid: 'Confira o endereço e a quantidade de análises.',
        forbidden: 'Você não é operador.',
        failed: 'Nada foi salvo. Tente de novo.'
      },
      listTitle: 'Contas com cota',
      listEmpty: 'Nenhuma conta tem cota ainda.',
      usage: '{used} de {limit} este mês',
      trial: '+{count} de teste'
    }
  },

  bulk: {
    eyebrow: 'Prospecção',
    title: 'Auditar uma lista de páginas',
    subtitle:
      'Cole até {max} URLs, uma por linha. Cada uma gasta uma rodada, e a tabela vai se preenchendo conforme elas terminam.',
    navLabel: 'Em lote',
    label: 'URLs, uma por linha',
    placeholder: 'https://cliente.com.br\nhttps://prospect.com.br',
    submit: 'Auditar {count} páginas',
    submitting: 'Colocando na fila...',
    willSpend: '{count} das suas {max} por lote.',
    overQuota: '{count} páginas, e você tem {remaining} análises restantes.',
    errors: {
      invalid_urls: 'Coloque pelo menos uma URL.',
      too_many_urls: 'São mais URLs do que cabem em um lote.',
      invalid_url: 'Um desses endereços não pode ser aberto. Confira a lista.',
      quota_exhausted: 'São mais análises do que você tem disponíveis este mês.',
      forbidden: 'A auditoria em lote vem com os planos Agência e Rede.',
      failed: 'Não deu para começar. Tente de novo em instantes.'
    },
    results: {
      title: 'O que o lote encontrou',
      running: 'Ainda rodando',
      download: 'Baixar CSV',
      failed: 'Esta rodada falhou',
      pending: 'Ainda rodando',
      open: 'Abrir {host}',
      columns: {
        page: 'Página',
        score: 'PageSpeed',
        critical: 'Erros críticos',
        problem: 'Problema principal',
        report: 'Relatório'
      }
    }
  },

  quota: {
    usage: '{used} de {limit} análises usadas este mês',
    remaining: '({count} restantes)',
    trial: 'Você ainda tem {count} análises gratuitas, e elas não expiram no fim do mês.',
    none: 'Não há mais análises disponíveis este mês.',
    seePlans: 'Ver os planos'
  },

  dashboard: {
    eyebrow: 'Páginas',
    title: 'Suas páginas',
    hintLabel: 'Como a análise funciona',
    hint: 'Cole a URL da landing page. O Hunch roda o PageSpeed Insights nela, confere o que os crawlers de IA podem ler e lista os erros de estrutura, copy, SEO e visibilidade para IA.',
    subtitle: 'Cole a URL de uma landing page para auditar.',
    emptyTitle: 'Nenhuma página ainda',
    emptyDescription: 'Cole a URL de uma landing page aqui em cima para rodar a sua primeira análise.',
    pagination: {
      label: 'Mais páginas suas',
      previous: 'Mais recentes',
      next: 'Mais antigas',
      position: 'Página {page} de {pages}'
    }
  },

  urlForm: {
    measuring: 'Abrindo a página e medindo...',
    urlLabel: 'URL da landing page',
    urlPlaceholder: 'https://landing-page-do-cliente.com',
    analyze: 'Analisar',
    analyzing: 'Analisando...',
    errorInvalidUrl: 'Informe uma URL válida, incluindo https://',
    errorInvalidCompetitor: 'A página de comparação precisa de uma URL válida, incluindo https://',
    competitorLabel: 'Comparar com outra página (opcional)',
    competitorPlaceholder: 'https://outra-landing-page.com',
    competitorHint: 'A gente mede essa página também e mostra as notas dela ao lado destas. Conta como uma análise só.',
    errorGeneric: 'Algo deu errado. Tente novamente.',
    errorLimitReached: 'Você rodou várias análises em pouco tempo. Espere uma hora e tente de novo.',
    errorBusy: 'Não deu para começar a análise agora. Ela não contou na sua cota. Tente de novo em instantes.',
    errorUnsupportedUrl: 'Essa URL não é válida ou não é suportada.',
    errorScrapeFailed: 'Não conseguimos carregar essa página. Confira a URL e tente novamente.',
    errorAnalyzeFailed: 'Algo deu errado durante a análise. Tente novamente.',
    errorQuotaExhausted: 'Esta conta já usou todas as análises do mês.'
  },


  history: {
    trendAria: 'As páginas deste cliente, com a nota anterior à última rodada ao lado de cada uma',
    wasScore: '(era {score})',
    openAria:'Abrir análise de {url}',
    deleteAria: 'Excluir análise de {url}',
  },

  analysis: {
    eyebrow: 'Erros',
    title: 'Erros nesta página',
    hintLabel: 'Como usar esta tela',
    hint: 'Cada seção é um tema. Ela abre com o que o Google PageSpeed Insights mediu sobre ele e depois lista os erros: o que está errado e por quê, sem escrever a correção.',
    backToDashboard: 'Voltar para clientes',
    copyFailed: 'Não foi possível copiar',
    copyLink: 'Copiar link',
    sections: {
      flow: 'Estrutura',
      copy: 'Copy',
      seo: 'SEO',
      ai: 'IA'
    },
    sectionQuestions: {
      flow: 'O que na estrutura atrapalha quem chega?',
      copy: 'Quais linhas descrevem sem convencer?',
      seo: 'O que impede um buscador de ler a página?',
      ai: 'O que impede uma IA de ler e citar a página?'
    },
    // O que cada seção olhou, ao lado da pergunta dela. Antes isto ficava num segundo cabeçalho
    // dentro do card, junto de um segundo título que repetia a pergunta.
    sectionHints: {
      flow: {
        label: 'O que esta seção cobre',
        body: 'Erros em como a página está *montada*: o formulário, as chamadas para ação, o que responde objeções, o que carrega devagar.'
      },
      copy: {
        label: 'Como ler isto',
        body: 'Cada erro cita a linha *como ela está na página* e diz o que está errado nela.'
      },
      seo: {
        label: 'O que esta seção verificou',
        body: 'Vem do que a página *declara sobre si mesma* e das auditorias de SEO do PageSpeed Insights: title, meta description, canonical, dados estruturados, robots.txt.'
      },
      ai: {
        label: 'O que esta seção verificou',
        body: 'Para citar uma página, um assistente precisa *ler uma resposta nela*: fatos em texto, não presos dentro de uma imagem ou de um script.'
      }
    }
  },


  flow: {
    evidenceLabel: 'Por quê',
    count: {
      one: '{count} erro de estrutura',
      other: '{count} erros de estrutura'
    }
  },

  seo: {
    evidenceLabel: 'Por quê'
  },

  ai: {
    evidenceLabel: 'Por quê'
  },

  readout: {
    eyebrow: 'Medido pelo Google PageSpeed Insights',
    title: 'Nota geral',
    hintLabel: 'De onde vêm esses números',
    hint: 'Uma execução *mobile* do PageSpeed Insights nesta URL. A nota é a média das quatro categorias do Lighthouse, e as auditorias de cada categoria ficam na seção do tema. Os visitantes reais são usuários do Chrome nos últimos 28 dias, quando o Google tem visitantes suficientes.',
    unavailable: 'O PageSpeed Insights não respondeu para esta página. Rode de novo para tentar outra vez.',
    fixLabel: 'Erro listado:',
    groupOk: '{total} verificações, todas passando',
    groupWrong: '{wrong} de {total} precisam de atenção',
    groups: {
      crawler_access: 'O que um crawler de IA tem permissão de ler',
      site: 'O que um crawler encontra no site'
    },
    score: {
      label: 'Nota do PageSpeed',
      scale: 'A média das quatro notas de categoria do Lighthouse, de 0 a 100.',
      competitor: '{host}: {score}/100',
      railAria: 'Nota {score} de 100',
      severity: {
        ok: 'Boa',
        warn: 'Precisa melhorar',
        alert: 'Ruim'
      }
    },
    categories: {
      performance: 'Performance',
      accessibility: 'Acessibilidade',
      'best-practices': 'Boas práticas',
      seo: 'SEO'
    },
    auditsFailed: '{count} auditorias para olhar',
    auditsPassed: 'Todas as auditorias com nota passaram.',
    field: {
      title: 'Visitantes reais',
      scope: {
        page: 'Esta URL, últimos 28 dias',
        origin: 'Site inteiro, últimos 28 dias'
      },
      category: {
        FAST: 'Bom',
        AVERAGE: 'Precisa melhorar',
        SLOW: 'Ruim'
      },
      metrics: {
        LARGEST_CONTENTFUL_PAINT_MS: 'Largest Contentful Paint',
        INTERACTION_TO_NEXT_PAINT: 'Interaction to Next Paint',
        CUMULATIVE_LAYOUT_SHIFT_SCORE: 'Cumulative Layout Shift',
        FIRST_CONTENTFUL_PAINT_MS: 'First Contentful Paint',
        EXPERIMENTAL_TIME_TO_FIRST_BYTE: 'Time to First Byte'
      }
    },
    findings: {
      ai_crawlers_blocked: 'Crawlers de IA bloqueados no robots.txt',
      robots_blocks_all: 'Rastreamento permitido',
      no_sitemap: 'Sitemap declarado no robots.txt',
      broken_pages: 'Páginas que respondem com erro',
      redirected_pages: 'Páginas que redirecionam',
      noindex_pages: 'Páginas marcadas como noindex',
      sitemap_url_errors: 'URLs do sitemap com erro, redirect ou noindex',
      pages_missing_title: 'Páginas sem title',
      duplicate_titles: 'Páginas com o mesmo title de outra',
      pages_missing_meta_description: 'Páginas sem meta description',
      duplicate_meta_descriptions: 'Páginas com a mesma meta description',
      pages_missing_h1: 'Páginas sem H1',
      pages_multiple_h1: 'Páginas com mais de um H1',
      thin_pages: 'Páginas com pouco texto',
      canonical_elsewhere: 'Páginas com canonical apontando para outra URL',
      referring_domains: 'Domínios que linkam para o site',
      ranked_keywords: 'Palavras-chave em que o site ranqueia no Google'
    },
    site: {
      pagesRead: '{count} páginas lidas',
      source: {
        sitemap: 'Encontradas pelo sitemap e pelos links internos.',
        links: 'Encontradas pelos links internos, porque nenhum sitemap respondeu.'
      },
      truncated: 'Parou em {count} páginas.',
      noJavaScript: 'Cada página é lida pelo HTML que ela envia, sem executar JavaScript.',
      contentSkipped: 'Este site monta o texto com JavaScript, então title, headings e contagem de palavras não foram avaliados pelo HTML.',
      urls: 'Ver {count} páginas',
      morePages: 'e mais {count}'
    },
    index: {
      source: 'Estimativa da SE Ranking a partir do índice dela, não medida no site.',
      competitor: '{host}: {value}',
      noValue: 'sem dado',
      backlinks: {
        title: 'Links de outros sites',
        summary: '{count} domínios de referência',
        referringDomains: 'Domínios de referência',
        backlinks: 'Backlinks',
        rank: 'Autoridade do domínio',
        rankValue: '{value}/{max}',
        dofollow: 'Domínios de referência dofollow',
        topDomains: 'Ver os {count} principais domínios'
      },
      keywords: {
        title: 'Onde o site ranqueia no Google',
        total: '{count} palavras-chave no Google {market}',
        shown: 'As {count} que trazem mais tráfego estimado.',
        empty: 'A SE Ranking não tem rankings deste domínio no Google {market}.',
        keyword: 'Palavra-chave',
        position: 'Posição',
        volume: 'Buscas por mês',
        page: 'Página'
      }
    },
    criterion: {
      above: 'sinalizamos a partir de {value}',
      below: 'sinalizamos em {value} ou menos',
      band: 'sinalizamos em nenhum, e a partir de {value}',
      exactly: 'sinalizamos quando não é {value}'
    },
    presence: {
      yes: 'Sim',
      no: 'Não'
    },
    delta: {
      up: '+{value}',
      down: '-{value}'
    },
    trend: {
      title: 'Nota ao longo do tempo',
      hint: 'Um ponto por medição desta página.'
    },
    atLeast: 'no mínimo',
    units: {
      seconds: '{value}s',
      milliseconds: '{value} ms',
      megabytes: '{value} MB'
    },
    run: {
      again: 'Rodar de novo',
      loading: 'Iniciando...',
      failed: 'Não deu para iniciar a nova rodada. Nada mudou neste relatório.',
      inProgress: 'Nova rodada em andamento. O relatório se atualiza quando ela terminar.',
      quotaExhausted: 'Não há mais análises disponíveis este mês.',
      lastRunFailed: 'A última rodada não terminou e não contou na cota. Os erros abaixo são da rodada anterior.',
      trendStartTitle: 'Acompanhe como esta página muda',
      trendStartBody: 'Uma rodada é uma foto, não um histórico. Rode esta página de novo, usando uma análise do mês, e cada nota ganha um "desde a última vez", mais uma linha mostrando a nota ao longo do tempo.'
    }
  },

  hypothesisList: {
    testThisFirst: 'Comece por aqui',
    assessmentLabel: 'O que ela faz hoje'
  },

  report: {
    progress: {
      title: 'Analisando a página',
      titleWriting: 'Escrevendo o relatório',
      phases: {
        open: 'Abrindo a página num navegador',
        measure: 'Medindo velocidade, SEO e o resto do site',
        write: 'Escrevendo os erros encontrados',
        assemble: 'Montando o relatório'
      },
      chipScore: 'PageSpeed {score}',
      chipPages: '{count} páginas do site lidas',
      chipShot: 'Print da página capturado',
      // O que a auditoria cobre, nunca o que já foi encontrado: a linha gira enquanto a rodada corre
      // e precisa ser verdadeira em qualquer segundo dela.
      tips: [
        'Vamos olhar a promessa da hero e o que ela pede do visitante.',
        'Cada erro vem com o que ele custa ao negócio, sem receita de bolo.',
        'A nota do PageSpeed vem do Google, medida no celular.',
        'O relatório sai com a sua marca, pronto para mandar ao cliente.'
      ],
      stalled: 'Está demorando mais que o normal. O trabalho continua na fila, e a página se atualiza sozinha quando ele terminar.'
    },
    generating: {
      note: 'A medição de cada seção já está fechada. As listas de erros estão sendo escritas agora e aparecem aqui sozinhas, então dá para sair desta página e voltar depois.',
      stalled: 'Está demorando mais que o normal. O trabalho continua na fila. Recarregue a página para conferir.'
    },
    failed: {
      heading: 'As listas de erros não vieram',
      body: 'A medição aí em cima continua valendo. A parte escrita não terminou, e esta rodada não conta na cota do mês.',
      cta: 'Rodar a página de novo'
    },
    measureFailed: {
      heading: 'Não deu para medir esta página',
      body: 'A rodada não terminou e não conta na cota do mês.'
    },
    teardown: 'Auditoria de landing page',
    plan: 'Auditoria de landing page',
    landingPageAnalyzed: 'Landing page analisada',
    dated: 'Revisado em {date}',
    summaryBody:
      'Encontramos {changes} erros nesta página: {copy} no texto e {structural} na estrutura, no SEO e na visibilidade para IA.',
    summaryPending: 'As listas de erros desta página ainda não foram escritas.',
    changesFound: 'Erros encontrados',
    copyErrors: 'Erros de texto',
    startHere: {
      eyebrow: 'Prioridade',
      title: 'Os três maiores problemas',
      lead: 'O resto do relatório lista tudo o que foi encontrado. Estes três são os que mais custam.'
    },
    mobileShot: 'A página no celular, como ela foi medida',
    pageShot: {
      // A contagem existe porque os erros de estrutura, SEO e IA não têm onde ser apontados, e uma
      // imagem calada sobre isso seria lida como "o resto da página está limpo".
      marked: {
        one: '{count} de {total} erros de texto está marcado aqui',
        other: '{count} de {total} erros de texto estão marcados aqui'
      },
      noMarkers: 'Nenhum dos erros de texto pôde ser localizado na imagem.',
      markerAria: 'Erro {rank}: {title}'
    },
    shareWhatsapp: {
      label: 'Enviar no WhatsApp',
      message: 'Rodei uma auditoria em {host} e encontrei alguns pontos para corrigir. O relatório está aqui: {url}'
    },
    agencyNote: {
      label: 'Seu recado neste relatório',
      readerLabel: 'Recado da agência',
      placeholder: 'O que você quer que o leitor veja primeiro, com as suas palavras.',
      save: 'Salvar recado',
      result: {
        saved: 'Recado salvo.',
        invalid: 'Esse recado é longo demais para salvar.',
        forbidden: 'Este relatório não é seu para editar.',
        failed: 'Não deu para salvar. Tente de novo.'
      }
    },
    rail: {
      label: 'Nesta página',
      sections: {
        start: 'Maiores erros',
        readout: 'Nota geral'
      }
    },
    current: 'Atual',
    whyThisIsWrong: 'Por que isto é um erro'
  },

  blog: ptBrBlog
}
