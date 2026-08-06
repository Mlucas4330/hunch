import type {
  AnalysisOutput,
  FlowFixOutput,
  VariantOutput,
  VisibilityFixOutput
} from '@/lib/ai/schema'
import type { Locale } from '@/lib/enums'
import type { PageSeo, PageStructure } from '@/lib/scrape'

// Fixtures are written per locale for the same reason the real prompts take a language: the analysis
// is written in the language the user is reading the app in, and E2E_FIXTURES must not be the one
// path that ignores that. Each map is Record<Locale, T>, so a new locale without a fixture fails
// typecheck exactly like a missing dictionary key.
//
// What is NOT translated, mirroring the prompt contracts in lib/ai/prompt.ts:
// - current_copy quotes the (English) fictional page these fixtures pretend to have scraped, and is
//   what analyzeLandingPage synthesizes its elements from. Translating it would break target
//   resolution.
// - competitors, section and category are proper names and Postgres enum values.

// The structural readout the fixture analysis pretends to have scraped: a page with no social sign
// in, no FAQ, a long form, and competing calls to action, so every fixture flow fix has a cause.
// Numeric and boolean throughout, so it is language independent.
export const FIXTURE_STRUCTURE: PageStructure = {
  hasOauth: false,
  oauthProviders: [],
  formCount: 1,
  formFieldCount: 6,
  hasFaq: false,
  hasPricing: true,
  hasTestimonials: true,
  hasVideo: false,
  hasStickyCta: false,
  bodyLinkCount: 7,
  aboveFoldCtaCount: 3,
  navLinkCount: 8,
  headingCount: 14,
  sectionCount: 9,
  wordCount: 720
}

// The metadata readout to match: a page that declares a title and Open Graph tags but no description,
// no canonical, no structured data, and several images with no alt text -- so every fixture
// visibility fix below is traceable to a null or high field here, exactly as the flow fixes are to
// FIXTURE_STRUCTURE. `lang` is `en`, which is also what makes detectMarket resolve the fixture run to
// the default market.
export const FIXTURE_SEO: PageSeo = {
  title: 'Acme - The workspace for modern teams',
  metaDescription: null,
  canonical: null,
  robotsMeta: null,
  lang: 'en',
  h1Count: 1,
  imageCount: 12,
  imagesMissingAlt: 5,
  internalLinkCount: 14,
  hasOgTitle: true,
  hasOgDescription: true,
  hasOgImage: false,
  jsonLdTypes: []
}

// The flow playbook under E2E_FIXTURES. Four fixes across distinct categories, ordered by impact
// descending, each one traceable to a false/high field in FIXTURE_STRUCTURE above.
const PLAYBOOK: Record<Locale, FlowFixOutput[]> = {
  en: [
    {
      category: 'signup_friction',
      title: 'Offer login with Google',
      problem:
        'Signing up means typing an email, inventing a password, and waiting on a confirmation.',
      steps: [
        'Register an OAuth client with Google and add the callback URL for your app',
        'Add a "Continue with Google" button above the email field on the signup form',
        'Match an existing account by verified email so returning users are never duplicated'
      ],
      impact_score: 9,
      effort_score: 4,
      evidence:
        'Every account created today costs the visitor a password they must invent and then remember.'
    },
    {
      category: 'objections',
      title: 'Add a Q&A block before the footer',
      problem: 'The page never answers what happens after the trial, so visitors leave to find out.',
      steps: [
        'Collect the five questions your support inbox receives most often',
        'Answer each in two sentences inside a collapsible list above the footer',
        'Link the pricing question straight to the pricing section'
      ],
      impact_score: 7,
      effort_score: 2,
      evidence: 'Reference pages resolve pricing and cancellation questions on the page itself.'
    },
    {
      category: 'decision_load',
      title: 'Cut the signup form to two fields',
      problem: 'The form asks for six fields before the visitor has seen any value.',
      steps: [
        'Keep only email and password on the form',
        'Move company name and team size into the first onboarding screen',
        'Drop the fields you never query'
      ],
      impact_score: 7,
      effort_score: 3,
      evidence:
        'Four of the six fields are asked before the visitor has any reason to answer them.'
    },
    {
      category: 'cta_placement',
      title: 'Repeat the primary action after pricing',
      problem: 'The only call to action sits above the fold, far from where the decision happens.',
      steps: [
        'Add the same primary button directly under the pricing table',
        'Keep the label identical to the hero button so it reads as one path'
      ],
      impact_score: 5,
      effort_score: 1,
      evidence: 'Reference pages repeat one action rather than offering several competing ones.'
    }
  ],
  'pt-BR': [
    {
      category: 'signup_friction',
      title: 'Ofereça login com o Google',
      problem:
        'Criar conta exige digitar um email, inventar uma senha e esperar por uma confirmação.',
      steps: [
        'Registre um cliente OAuth no Google e adicione a URL de callback do seu app',
        'Adicione um botão "Continuar com o Google" acima do campo de email no formulário de cadastro',
        'Reconheça a conta existente pelo email verificado para nunca duplicar quem volta'
      ],
      impact_score: 9,
      effort_score: 4,
      evidence:
        'Toda conta criada hoje custa ao visitante uma senha que ele precisa inventar e depois lembrar.'
    },
    {
      category: 'objections',
      title: 'Adicione um bloco de perguntas antes do rodapé',
      problem:
        'A página nunca responde o que acontece depois do teste, então o visitante sai para descobrir.',
      steps: [
        'Reúna as cinco perguntas que sua caixa de suporte mais recebe',
        'Responda cada uma em duas frases numa lista recolhível acima do rodapé',
        'Ligue a pergunta sobre preço direto à seção de planos'
      ],
      impact_score: 7,
      effort_score: 2,
      evidence:
        'As páginas de referência resolvem dúvidas de preço e cancelamento na própria página.'
    },
    {
      category: 'decision_load',
      title: 'Reduza o formulário de cadastro a dois campos',
      problem: 'O formulário pede seis campos antes de o visitante ter visto qualquer valor.',
      steps: [
        'Mantenha apenas email e senha no formulário',
        'Mova nome da empresa e tamanho do time para a primeira tela de onboarding',
        'Descarte os campos que você nunca consulta'
      ],
      impact_score: 7,
      effort_score: 3,
      evidence:
        'Quatro dos seis campos são pedidos antes de o visitante ter qualquer motivo para respondê-los.'
    },
    {
      category: 'cta_placement',
      title: 'Repita a ação principal depois dos planos',
      problem:
        'A única chamada para ação fica acima da dobra, longe de onde a decisão acontece.',
      steps: [
        'Adicione o mesmo botão principal logo abaixo da tabela de planos',
        'Mantenha o rótulo idêntico ao do botão do topo para que os dois leiam como um só caminho'
      ],
      impact_score: 5,
      effort_score: 1,
      evidence:
        'As páginas de referência repetem uma ação em vez de oferecer várias concorrentes entre si.'
    }
  ]
}

// The visibility audit under E2E_FIXTURES. Three fixes, each traceable to a null or high field in
// FIXTURE_SEO. Note what is absent: no robots.txt finding, because the fixture run performs no fetch
// and the audit must never invent one -- and no evidence line carries a number, a ranking, or a
// promise that a model will cite the page, which is the contract visibilityPrompt enforces.
const VISIBILITY: Record<Locale, VisibilityFixOutput[]> = {
  en: [
    {
      category: 'metadata',
      title: 'Write a meta description',
      problem: 'The page declares no description, so search engines write their own from the copy.',
      steps: [
        'Add a meta description tag summarizing what the product does and who it is for',
        'Keep it to one sentence that reads as a whole thought on its own'
      ],
      impact_score: 8,
      effort_score: 1,
      evidence:
        'With no description declared, the snippet a reader sees is assembled from whatever text the crawler picked.'
    },
    {
      category: 'structured_data',
      title: 'Add Organization structured data',
      problem: 'Nothing on the page states in machine readable form what this company is.',
      steps: [
        'Add a JSON-LD script describing the Organization with its name, URL, and logo',
        'Add a SoftwareApplication entry naming the product and its category',
        'Validate the markup renders without errors before shipping'
      ],
      impact_score: 6,
      effort_score: 3,
      evidence:
        'A model reading this page has to infer what the company is from prose, because no markup states it.'
    },
    {
      category: 'ai_answerability',
      title: 'Add alt text to the product images',
      problem: 'Several images carry no alt attribute, so their content reaches no crawler at all.',
      steps: [
        'Write alt text for every image that carries a claim or a screenshot of the product',
        'Leave alt empty only for images that are purely decorative'
      ],
      impact_score: 5,
      effort_score: 2,
      evidence:
        'What those images show is currently readable only by a person looking at the page.'
    }
  ],
  'pt-BR': [
    {
      category: 'metadata',
      title: 'Escreva uma meta description',
      problem:
        'A página não declara descrição, então os buscadores escrevem a deles a partir do texto.',
      steps: [
        'Adicione uma tag meta description resumindo o que o produto faz e para quem ele é',
        'Mantenha em uma frase que se sustente sozinha como ideia completa'
      ],
      impact_score: 8,
      effort_score: 1,
      evidence:
        'Sem descrição declarada, o trecho que o leitor vê é montado a partir de qualquer texto que o rastreador escolheu.'
    },
    {
      category: 'structured_data',
      title: 'Adicione dados estruturados de Organization',
      problem: 'Nada na página diz, em formato legível por máquina, o que é esta empresa.',
      steps: [
        'Adicione um script JSON-LD descrevendo a Organization com nome, URL e logo',
        'Adicione uma entrada SoftwareApplication nomeando o produto e sua categoria',
        'Valide se a marcação carrega sem erros antes de publicar'
      ],
      impact_score: 6,
      effort_score: 3,
      evidence:
        'Um modelo que lê esta página precisa deduzir o que é a empresa a partir do texto corrido, porque nenhuma marcação diz isso.'
    },
    {
      category: 'ai_answerability',
      title: 'Adicione texto alternativo às imagens',
      problem:
        'Várias imagens não têm atributo alt, então o conteúdo delas não chega a rastreador nenhum.',
      steps: [
        'Escreva o texto alternativo de toda imagem que carrega uma afirmação ou uma tela do produto',
        'Deixe o alt vazio apenas nas imagens puramente decorativas'
      ],
      impact_score: 5,
      effort_score: 2,
      evidence:
        'O que essas imagens mostram hoje só é legível por uma pessoa olhando para a página.'
    }
  ]
}

// Returned by generateAlternateVariants under E2E_FIXTURES so the challenger picker on the
// run-a-test screen has its three pills without calling Claude.
const ALTERNATE_VARIANTS: Record<Locale, VariantOutput[]> = {
  en: [
    {
      copy: 'The workspace that gets [your core job] done in [timeframe]',
      evidence:
        'Vercel headlines a concrete time-to-value - fill in the job and timeframe you can prove.'
    },
    {
      copy: 'Stop [specific pain]. Start shipping.',
      evidence:
        'Retool frames the headline against the cost of the status quo - name the pain your buyers feel.'
    }
  ],
  'pt-BR': [
    {
      copy: 'O espaço de trabalho que resolve [seu trabalho principal] em [prazo]',
      evidence:
        'A Vercel destaca um tempo até o valor concreto, preencha com o trabalho e o prazo que você consegue provar.'
    },
    {
      copy: 'Pare de [dor específica]. Comece a entregar.',
      evidence:
        'A Retool posiciona o título contra o custo de continuar como está, nomeie a dor que seus compradores sentem.'
    }
  ]
}

// Deterministic output used when E2E_FIXTURES=1 so end-to-end tests can run without
// scraping, web search, or calling Claude. Ordered by impact_score descending.
// Variants are templates (with [placeholders]) inspired by competitor strategy -- never
// fabricated numbers, quotes, or competitor names in the copy itself.
const COMPETITORS: AnalysisOutput['competitors'] = [
  { name: 'Linear', url: 'https://linear.app' },
  { name: 'Vercel', url: 'https://vercel.com' },
  { name: 'Retool', url: 'https://retool.com' }
]

const ANALYSIS: Record<Locale, AnalysisOutput> = {
  en: {
    competitors: COMPETITORS,
    hypotheses: [
      {
        section: 'headline',
        problem:
          'The headline describes the product category instead of the outcome the visitor wants.',
        current_copy: 'The all-in-one platform for modern teams',
        variants: [
          {
            copy: 'Ship faster: releases in [days], not [weeks]',
            evidence:
              'Linear leads with a quantified speed outcome - plug in your real before/after numbers.'
          }
        ],
        impact_score: 9,
        effort_score: 2,
        rationale:
          'A specific, quantified outcome in the headline raises perceived value within the first 5 seconds, matching how the strongest competitors open.'
      },
      {
        section: 'cta',
        problem: 'The primary CTA is generic and adds friction by implying a long commitment.',
        current_copy: 'Get started',
        variants: [
          {
            copy: 'Start free, no card required',
            evidence:
              'Linear and Vercel remove payment risk at the primary CTA - use only if your trial truly needs no card.'
          }
        ],
        impact_score: 8,
        effort_score: 1,
        rationale:
          'Removing risk and signalling zero cost lowers friction at the decision point, a lever every benchmarked competitor pulls.'
      },
      {
        section: 'social_proof',
        problem: 'Social proof is a vague logo strip with no credibility or relevance to the buyer.',
        current_copy: 'Trusted by teams everywhere',
        variants: [
          {
            copy: 'Trusted by [number] teams shipping every day',
            evidence:
              'Linear quantifies adoption instead of asserting trust - drop in your real active-team count.'
          }
        ],
        impact_score: 7,
        effort_score: 3,
        rationale:
          'Concrete numbers and recognizable names convert abstract trust into verifiable evidence, as the strongest competitor pages do.'
      },
      {
        section: 'pricing',
        problem: 'Pricing leads with the highest tier, anchoring visitors on cost before value.',
        current_copy: 'Enterprise - $99/user/mo',
        variants: [
          {
            copy: 'Free to start, [Pro] at [$price]',
            evidence:
              'Vercel anchors on a free entry tier before paid - map this to your real tiers.'
          }
        ],
        impact_score: 6,
        effort_score: 4,
        rationale:
          'Anchoring on a low-friction entry point reduces sticker shock, mirroring how competitors structure their pricing page.'
      },
      {
        section: 'features',
        problem: 'Features are listed as capabilities, not benefits the buyer cares about.',
        current_copy: 'Real-time sync, API access, role-based permissions',
        variants: [
          {
            copy: 'See data instantly, automate with the API, control access',
            evidence:
              'Linear frames each feature as a job-to-be-done - keep your real capabilities, lead with the outcome.'
          }
        ],
        impact_score: 5,
        effort_score: 3,
        rationale:
          'Reframing capabilities as outcomes connects each feature to a buyer goal, as competitor feature sections do.'
      },
      {
        section: 'subheadline',
        problem: 'The subheadline repeats the headline instead of handling the next objection.',
        current_copy: 'Built for teams that move fast',
        variants: [
          {
            copy: 'Set up in [setup time]. No migration, no training.',
            evidence: 'Vercel pre-empts setup-effort objections - use your real onboarding time.'
          }
        ],
        impact_score: 4,
        effort_score: 2,
        rationale:
          'Using the subheadline to pre-empt the top objection keeps momentum toward the CTA, as competitor pages do.'
      }
    ]
  },
  'pt-BR': {
    competitors: COMPETITORS,
    hypotheses: [
      {
        section: 'headline',
        problem: 'O título descreve a categoria do produto em vez do resultado que o visitante quer.',
        current_copy: 'The all-in-one platform for modern teams',
        variants: [
          {
            copy: 'Entregue em [dias], não em [semanas]',
            evidence:
              'A Linear abre com um ganho de velocidade quantificado, use seus números reais de antes e depois.'
          }
        ],
        impact_score: 9,
        effort_score: 2,
        rationale:
          'Um resultado específico e quantificado no título eleva o valor percebido nos primeiros 5 segundos, como abrem os concorrentes mais fortes.'
      },
      {
        section: 'cta',
        problem: 'A chamada principal é genérica e cria atrito ao sugerir um compromisso longo.',
        current_copy: 'Get started',
        variants: [
          {
            copy: 'Comece grátis, sem cartão',
            evidence:
              'Linear e Vercel tiram o risco de pagamento da chamada principal, use apenas se seu teste realmente dispensar cartão.'
          }
        ],
        impact_score: 8,
        effort_score: 1,
        rationale:
          'Remover o risco e sinalizar custo zero reduz o atrito no momento da decisão, alavanca que todo concorrente avaliado usa.'
      },
      {
        section: 'social_proof',
        problem: 'A prova social é vaga e não traz credibilidade nem relevância para o comprador.',
        current_copy: 'Trusted by teams everywhere',
        variants: [
          {
            copy: 'A escolha de [número] times que entregam',
            evidence:
              'A Linear quantifica a adoção em vez de afirmar confiança, coloque seu número real de times ativos.'
          }
        ],
        impact_score: 7,
        effort_score: 3,
        rationale:
          'Números concretos e nomes reconhecíveis convertem confiança abstrata em evidência verificável, como fazem as páginas concorrentes mais fortes.'
      },
      {
        section: 'pricing',
        problem: 'Os planos começam pelo mais caro, ancorando o visitante no custo antes do valor.',
        current_copy: 'Enterprise - $99/user/mo',
        variants: [
          {
            copy: 'Grátis para começar, [Pro] por [$preço]',
            evidence:
              'A Vercel ancora num plano de entrada gratuito antes do pago, mapeie isso para seus planos reais.'
          }
        ],
        impact_score: 6,
        effort_score: 4,
        rationale:
          'Ancorar num ponto de entrada de baixo atrito reduz o choque de preço, espelhando como os concorrentes estruturam a página de planos.'
      },
      {
        section: 'features',
        problem:
          'Os recursos aparecem como capacidades, não como benefícios que interessam ao comprador.',
        current_copy: 'Real-time sync, API access, role-based permissions',
        variants: [
          {
            copy: 'Veja dados na hora, automatize pela API, controle acessos',
            evidence:
              'A Linear apresenta cada recurso como uma tarefa a resolver, mantenha suas capacidades reais e comece pelo resultado.'
          }
        ],
        impact_score: 5,
        effort_score: 3,
        rationale:
          'Reformular capacidades como resultados conecta cada recurso a um objetivo do comprador, como fazem as seções de recursos dos concorrentes.'
      },
      {
        section: 'subheadline',
        problem: 'O subtítulo repete o título em vez de tratar a próxima objeção.',
        current_copy: 'Built for teams that move fast',
        variants: [
          {
            copy: 'Configure em [tempo de setup]. Sem migração, sem treinamento.',
            evidence:
              'A Vercel antecipa a objeção de esforço de configuração, use seu tempo real de onboarding.'
          }
        ],
        impact_score: 4,
        effort_score: 2,
        rationale:
          'Usar o subtítulo para antecipar a principal objeção mantém o avanço até a chamada para ação, como fazem as páginas concorrentes.'
      }
    ]
  }
}

export function fixtureAnalysis(locale: Locale): AnalysisOutput {
  return ANALYSIS[locale]
}

export function fixturePlaybook(locale: Locale): FlowFixOutput[] {
  return PLAYBOOK[locale]
}

export function fixtureVisibility(locale: Locale): VisibilityFixOutput[] {
  return VISIBILITY[locale]
}

export function fixtureAlternateVariants(locale: Locale): VariantOutput[] {
  return ALTERNATE_VARIANTS[locale]
}
