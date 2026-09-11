import type { AnalysisOutput, FlowFixOutput, VisibilityFixOutput } from '@/lib/ai/schema'
import type { Locale } from '@/lib/enums'
import type { PageMobile, PagePerformance, PageSameness, PageSeo, PageStructure } from '@/lib/scrape'
import type { CrawlerAccess } from '@/lib/robots'
import type { PageKeywords } from '@/lib/keywords'
import type { PageSpeed } from '@/lib/pagespeed'

export const FIXTURE_STRUCTURE: PageStructure = {
  hasOauth: false,
  // The fixture playbook reports a missing Google login, so the fixture page has to be one that
  // signs people in at all.
  hasAuthForm: true,
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
  wordCount: 720,

  requiredFieldCount: 5,
  fieldsWithoutLabel: 2,
  formSteps: 1,
  hasSubmit: true,
  hasClientValidation: true,
  deadCtaCount: 1,

  hasCnpj: false,
  testimonialWithAttributionCount: 0,
  clientLogoCount: 4,
  trustBadgeCount: 0,
  hasPrivacyPolicy: true,
  hasTerms: true,
  hasPhysicalAddress: false,
  hasPhone: false,
  hasSocialLinks: true
}

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
  jsonLdTypes: [],
  headings: ['The workspace for modern teams', 'Pricing', 'Frequently asked questions']
}

export const FIXTURE_PERFORMANCE: PagePerformance = {
  ttfbMs: 410,
  fcpMs: 1900,
  lcpMs: 4200,
  domContentLoadedMs: 2600,
  loadMs: 5100,
  transferredBytes: 3_400_000,
  requestCount: 84,
  domNodeCount: 1450
}

export const FIXTURE_MOBILE: PageMobile = {
  horizontalOverflow: true,
  smallTapTargetCount: 6,
  tinyTextCount: 11,
  aboveFoldCtaCount: 1,
  hasViewportMeta: true
}

export const FIXTURE_SAMENESS: PageSameness = {
  gradientCount: 4,
  fontFamilyCount: 1,
  iconSetCount: 11,
  cardTripletCount: 3,
  emojiHeadingCount: 6,
  genericCtaCount: 2,
  placeholderCount: 0,
  hasUnlinkedLogoStrip: true,
  declaredBuilder: true,
  hasStockHeroImage: false
}

export const FIXTURE_CRAWLER_ACCESS: CrawlerAccess = {
  status: 'found',
  blockedAgents: ['GPTBot'],
  blocksAll: false,
  sitemaps: []
}

// Scores below the top band in every category and field data present, so the e2e run renders the
// failing audits and the field card rather than only their empty states.
export const FIXTURE_PAGESPEED: PageSpeed = {
  categories: {
    performance: 54,
    accessibility: 81,
    'best-practices': 92,
    seo: 75
  },
  field: {
    scope: 'origin',
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 3400, category: 'AVERAGE' },
      INTERACTION_TO_NEXT_PAINT: { percentile: 180, category: 'FAST' },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 12, category: 'AVERAGE' },
      FIRST_CONTENTFUL_PAINT_MS: { percentile: 2100, category: 'AVERAGE' },
      EXPERIMENTAL_TIME_TO_FIRST_BYTE: { percentile: 900, category: 'AVERAGE' }
    }
  },
  audits: [
    {
      id: 'largest-contentful-paint',
      category: 'performance',
      title: 'Largest Contentful Paint',
      displayValue: '4.8 s',
      score: 0.21
    },
    {
      id: 'image-alt',
      category: 'accessibility',
      title: 'Image elements do not have [alt] attributes',
      displayValue: null,
      score: 0
    },
    {
      id: 'meta-description',
      category: 'seo',
      title: 'Document does not have a meta description',
      displayValue: null,
      score: 0
    }
  ]
}

export const FIXTURE_KEYWORDS: PageKeywords = {
  totalWords: 720,
  terms: [
    { term: 'workspace', count: 14, inTitle: true, inH1: true, inMetaDescription: false, inHeadings: true },
    { term: 'teams', count: 11, inTitle: true, inH1: true, inMetaDescription: false, inHeadings: true },
    { term: 'modern teams', count: 6, inTitle: true, inH1: true, inMetaDescription: false, inHeadings: true },
    { term: 'pricing', count: 5, inTitle: false, inH1: false, inMetaDescription: false, inHeadings: true },
    { term: 'onboarding', count: 3, inTitle: false, inH1: false, inMetaDescription: false, inHeadings: false }
  ]
}

const PLAYBOOK: Record<Locale, FlowFixOutput[]> = {
  en: [
    {
      category: 'signup_friction',
      finding: 'no_social_signin',
      title: 'No way to sign in with Google',
      problem:
        'Signing up means typing an email, inventing a password, and waiting on a confirmation.',
      impact_score: 9,
      evidence:
        'Every account created today costs the visitor a password they must invent and then remember.'
    },
    {
      category: 'objections',
      finding: 'no_faq',
      title: 'No answers to the questions before signup',
      problem:
        'The page never answers what happens after the trial, so visitors leave to find out.',
      impact_score: 7,
      evidence:
        'The page sends the visitor elsewhere to learn what the trial costs and how to leave it.'
    },
    {
      category: 'decision_load',
      finding: 'form_fields',
      title: 'Signup form asks for six fields',
      problem: 'The form asks for six fields before the visitor has seen any value.',
      impact_score: 7,
      evidence: 'Four of the six fields are asked before the visitor has any reason to answer them.'
    },
    {
      category: 'performance',
      finding: 'largest-contentful-paint',
      title: 'The main content paints late on a phone',
      problem: 'A visitor on a phone waits for the largest element before the page shows what it is.',
      impact_score: 5,
      evidence:
        'PageSpeed Insights measured the largest contentful paint well past the point a visitor starts to scroll away.'
    }
  ],
  'pt-BR': [
    {
      category: 'signup_friction',
      finding: 'no_social_signin',
      title: 'Não dá para entrar com o Google',
      problem:
        'Criar conta exige digitar um email, inventar uma senha e esperar por uma confirmação.',
      impact_score: 9,
      evidence:
        'Toda conta criada hoje custa ao visitante uma senha que ele precisa inventar e depois lembrar.'
    },
    {
      category: 'objections',
      finding: 'no_faq',
      title: 'Nenhuma resposta às dúvidas antes do cadastro',
      problem:
        'A página nunca responde o que acontece depois do teste, então o visitante sai para descobrir.',
      impact_score: 7,
      evidence:
        'A página faz o visitante sair para descobrir preço e cancelamento.'
    },
    {
      category: 'decision_load',
      finding: 'form_fields',
      title: 'Formulário de cadastro pede seis campos',
      problem: 'O formulário pede seis campos antes de o visitante ter visto qualquer valor.',
      impact_score: 7,
      evidence:
        'Quatro dos seis campos são pedidos antes de o visitante ter qualquer motivo para respondê-los.'
    },
    {
      category: 'performance',
      finding: 'largest-contentful-paint',
      title: 'O conteúdo principal aparece tarde no celular',
      problem: 'No celular, o visitante espera o maior elemento carregar antes de entender a página.',
      impact_score: 5,
      evidence:
        'O PageSpeed Insights mediu o maior elemento visível carregando bem depois do momento em que o visitante começa a rolar.'
    }
  ]
}

const VISIBILITY: Record<Locale, VisibilityFixOutput[]> = {
  en: [
    {
      category: 'metadata',
      finding: 'no_meta_description',
      title: 'No meta description',
      problem: 'The page declares no description, so search engines write their own from the copy.',
      impact_score: 8,
      evidence:
        'With no description declared, the snippet a reader sees is assembled from whatever text the crawler picked.'
    },
    {
      category: 'structured_data',
      finding: 'no_structured_data',
      title: 'No structured data about the company',
      problem: 'Nothing on the page states in machine readable form what this company is.',
      impact_score: 6,
      evidence:
        'A model reading this page has to infer what the company is from prose, because no markup states it.'
    },
    {
      category: 'ai_answerability',
      finding: 'images_missing_alt',
      title: 'Product images carry no alt text',
      problem: 'Several images carry no alt attribute, so their content reaches no crawler at all.',
      impact_score: 5,
      evidence: 'What those images show is currently readable only by a person looking at the page.'
    }
  ],
  'pt-BR': [
    {
      category: 'metadata',
      finding: 'no_meta_description',
      title: 'Sem meta description',
      problem:
        'A página não declara descrição, então os buscadores escrevem a deles a partir do texto.',
      impact_score: 8,
      evidence:
        'Sem descrição declarada, o trecho que o leitor vê é montado a partir de qualquer texto que o rastreador escolheu.'
    },
    {
      category: 'structured_data',
      finding: 'no_structured_data',
      title: 'Nenhum dado estruturado sobre a empresa',
      problem: 'Nada na página diz, em formato legível por máquina, o que é esta empresa.',
      impact_score: 6,
      evidence:
        'Um modelo que lê esta página precisa deduzir o que é a empresa a partir do texto corrido.'
    },
    {
      category: 'ai_answerability',
      finding: 'images_missing_alt',
      title: 'Imagens do produto sem texto alternativo',
      problem:
        'Várias imagens não têm atributo alt, então o conteúdo delas não chega a rastreador nenhum.',
      impact_score: 5,
      evidence:
        'O que essas imagens mostram hoje só é legível por uma pessoa olhando para a página.'
    }
  ]
}

const ANALYSIS: Record<Locale, AnalysisOutput> = {
  en: {
    hypotheses: [
      {
        section: 'headline',
        current_copy: 'The all-in-one platform for modern teams',
        assessment:
          'The headline names the audience and the breadth of the product, so the visitor knows who it is for.',
        problem:
          'The headline describes the product category instead of the outcome the visitor wants.',
        impact_score: 9,
        rationale: 'The visitor has to work out what they get before they know whether to keep reading.'
      },
      {
        section: 'cta',
        current_copy: 'Get started',
        assessment: 'The button says an action is available and nothing else about it.',
        problem: 'The label never says what happens after the click or what it costs.',
        impact_score: 8,
        rationale: 'A visitor unsure of the commitment holds back at the one moment the page asks them to act.'
      },
      {
        section: 'social_proof',
        current_copy: 'Trusted by teams everywhere',
        assessment: 'The line claims other teams already use the product.',
        problem: 'The claim names nobody and nothing the visitor could check.',
        impact_score: 7,
        rationale: 'An unverifiable claim of trust asks the visitor to take the page at its word.'
      },
      {
        section: 'pricing',
        current_copy: 'Enterprise - $99/user/mo',
        assessment: 'The line states a real price and who it is for.',
        problem: 'Pricing opens on the most expensive tier.',
        impact_score: 6,
        rationale: 'The first number the visitor reads is the largest one on the page.'
      },
      {
        section: 'features',
        current_copy: 'Real-time sync, API access, role-based permissions',
        assessment: 'The list names three things the product can do, accurately.',
        problem: 'Each item is a capability with no job attached to it.',
        impact_score: 5,
        rationale: 'The visitor has to map each feature to their own work without help.'
      },
      {
        section: 'subheadline',
        current_copy: 'Built for teams that move fast',
        assessment: 'The subheadline restates the audience the headline already named.',
        problem: 'The subheadline repeats the headline instead of answering the next question.',
        impact_score: 4,
        rationale: 'The space under the headline says nothing the visitor has not already read.'
      }
    ]
  },
  'pt-BR': {
    hypotheses: [
      {
        section: 'headline',
        current_copy: 'The all-in-one platform for modern teams',
        assessment:
          'O título nomeia o público e a abrangência do produto, então o visitante sabe para quem ele é.',
        problem:
          'O título descreve a categoria do produto em vez do resultado que o visitante quer.',
        impact_score: 9,
        rationale: 'O visitante precisa deduzir o que recebe antes de saber se vale continuar lendo.'
      },
      {
        section: 'cta',
        current_copy: 'Get started',
        assessment: 'O botão diz que existe uma ação disponível e nada mais sobre ela.',
        problem: 'O rótulo não diz o que acontece depois do clique nem quanto custa.',
        impact_score: 8,
        rationale: 'Quem não sabe o compromisso recua justo no momento em que a página pede a ação.'
      },
      {
        section: 'social_proof',
        current_copy: 'Trusted by teams everywhere',
        assessment: 'A linha afirma que outros times já usam o produto.',
        problem: 'A afirmação não cita ninguém nem nada que o visitante possa conferir.',
        impact_score: 7,
        rationale: 'Uma confiança que não dá para verificar pede que o visitante acredite na palavra da página.'
      },
      {
        section: 'pricing',
        current_copy: 'Enterprise - $99/user/mo',
        assessment: 'A linha informa um preço real e para quem ele vale.',
        problem: 'Os planos começam pelo mais caro.',
        impact_score: 6,
        rationale: 'O primeiro número que o visitante lê é o maior da página.'
      },
      {
        section: 'features',
        current_copy: 'Real-time sync, API access, role-based permissions',
        assessment: 'A lista nomeia com precisão três coisas que o produto faz.',
        problem: 'Cada item é uma capacidade sem a tarefa que ela resolve.',
        impact_score: 5,
        rationale: 'O visitante precisa ligar cada recurso ao próprio trabalho sozinho.'
      },
      {
        section: 'subheadline',
        current_copy: 'Built for teams that move fast',
        assessment: 'O subtítulo repete o público que o título já nomeou.',
        problem: 'O subtítulo repete o título em vez de responder a próxima dúvida.',
        impact_score: 4,
        rationale: 'O espaço abaixo do título não diz nada que o visitante já não tenha lido.'
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
