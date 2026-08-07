// Emphasis inside a sentence is marked with *asterisks* and rendered by <RichText>, so a
// translator moves the emphasis with the words instead of reassembling JSX.
export const en = {
  // Titles and descriptions for search results and link unfurls. The site name doubles as the
  // og:siteName and as the suffix Next appends to every child title.
  metadata: {
    title: 'Hunch',
    description: 'Turn your landing page into ranked, competitor-grounded A/B test hunches.',
    ogImageAlt: 'Hunch - ranked A/B test hypotheses for your landing page',
    pages: {
      landing: {
        title: 'Find what costs you signups',
        description:
          'Paste your landing page URL and get the A/B tests worth running, ranked, grounded in real competitors, and already written.'
      },
      signin: {
        title: 'Sign in',
        description: 'Sign in to Hunch with Google.'
      },
      dashboard: {
        title: 'Your analyses',
        description: 'Every landing page you have analyzed, and the tests each one produced.'
      },
      analysis: {
        title: 'Your test ideas',
        description: 'Ranked A/B test hypotheses and the flow playbook for this landing page.'
      },
      analysisReport: {
        title: 'Conversion teardown',
        description: 'The printable teardown for this landing page analysis.'
      },
      test: {
        title: 'Run a test',
        description: 'Approve the challenger, set the conversion goal, and launch the live test.'
      },
      leads: {
        title: 'Waitlist leads',
        description: 'Leads captured by the public reports.'
      },
      report: {
        title: 'A/B test plan for {host}',
        description:
          '{count} ranked tests to lift conversion on {host}, with the copy to run and the reasoning behind each one.'
      }
    }
  },

  common: {
    upgrade: 'Talk to us',
    close: 'Close',
    cancel: 'Cancel',
    delete: 'Delete',
    deleting: 'Deleting',
    copy: 'Copy',
    copied: 'Copied',
    or: 'or',
    none: '-'
  },

  labels: {
    section: {
      headline: 'Headline',
      subheadline: 'Subheadline',
      cta: 'CTA',
      social_proof: 'Social Proof',
      pricing: 'Pricing',
      features: 'Features',
      hero_image: 'Hero Image',
      navigation: 'Navigation',
      other: 'Other'
    },
    flowCategory: {
      signup_friction: 'Signup Friction',
      cta_placement: 'CTA Placement',
      decision_load: 'Decision Load',
      objections: 'Objections',
      trust: 'Trust',
      pricing_clarity: 'Pricing Clarity',
      page_structure: 'Page Structure',
      indexability: 'Indexability',
      metadata: 'Metadata',
      structured_data: 'Structured Data',
      ai_answerability: 'AI Answerability'
    },
    market: {
      us: 'United States',
      br: 'Brazil'
    },
    hypothesisStatus: {
      pending: 'Pending',
      testing: 'Testing',
      completed: 'Completed',
      skipped: 'Skipped'
    },
    variantStatus: {
      proposed: 'Proposed',
      testing: 'Testing',
      winner: 'Winner',
      rejected: 'Rejected'
    },
    experimentStatus: {
      running: 'Running',
      stopped: 'Stopped',
      completed: 'Completed'
    },
    experimentArm: {
      control: 'Control',
      variant: 'Variant'
    },
    experimentRecommendation: {
      ship_variant: 'Ship the variant',
      keep_control: 'Keep current copy',
      inconclusive: 'Inconclusive - not enough traffic'
    },
    // Display label only. The Postgres value stays `solo`, so changing this costs no migration --
    // and "Solo" named the old audience, the founder working alone.
    plan: {
      free: 'Free',
      solo: 'Pro'
    },
    leadSource: {
      report: 'Report wall',
      contact: 'Asked to talk'
    }
  },

  nav: {
    homeAria: 'Hunch home',
    dashboard: 'Dashboard',
    signIn: 'Sign in',
    signOut: 'Sign out',
    account: 'Account',
    languageAria: 'Language'
  },

  infoHint: {
    defaultLabel: 'How this step works'
  },

  score: {
    impact: 'Impact',
    effort: 'Effort',
    aria: '{label} {score} of 10',
    // One letter, prefixed to the number on a compact chip: "I9", "E3".
    short: {
      impact: 'I',
      effort: 'E'
    }
  },

  landing: {
    eyebrow: 'Audit tooling for people who sell CRO',
    headlineTop: 'Show the prospect what their page costs them.',
    headlineBottom: 'Send it under your own name.',
    lead: 'Paste any landing page. Get a measured teardown you can put in front of a client in minutes, with the ranked fixes and the copy already written.',
    cta: 'Run a report',
    howItWorksLink: 'How it works',

    sample: [
      {
        problem: 'Your H1 says what you do, not why it beats the tab they already have open.',
        variant: 'Ship changes to your pricing page without waiting on a designer.',
        evidence: 'Linear leads with the outcome the founder wants, not the feature set.'
      },
      {
        problem: '"Sign up" asks for commitment before the visitor has seen a single win.'
      },
      {
        problem: 'Nothing above the fold tells them another founder trusted this.'
      }
    ],

    readout: {
      domain: 'landing page',
      liveTest: 'Live test',
      winner: 'Headline variant wins',
      detail: '14-day test, {visitors} visitors',
      lift: '+18%',
      significant: 'Significant',
      why: 'Why'
    },

    reality: {
      eyebrow: 'The reality',
      heading: 'The hard part of selling an audit is doing it before anyone has paid you.'
    },
    pains: [
      {
        headline: 'A good teardown takes half a day.',
        reality: 'Reading the page, checking the head, timing the load, looking at two competitors. Then you do it again for the next prospect who may never reply.',
        answer: 'One URL, a few minutes, and the whole readout comes back measured rather than remembered.'
      },
      {
        headline: 'Opinion does not survive a procurement meeting.',
        reality: '"Your headline is weak" is a matter of taste to the person who wrote it. It stops being taste when it has a number beside it.',
        answer: 'Form fields, calls to action above the fold, load time, alt text, structured data. Counted on their page, next to the competitors they named.'
      },
      {
        headline: 'A tool with someone else logo on it is not your deliverable.',
        reality: 'You cannot send a document that advertises a vendor to your client, and you certainly cannot send one that asks them for their email.',
        answer: 'On a paid plan the report carries no mark of ours, no wall, and nothing hidden. It is yours to send.'
      }
    ],

    how: {
      eyebrow: 'How it works',
      heading: 'Win the meeting first. Prove the lift after you have signed.',
      intro: 'The report is what gets you in the room: a measured teardown of a page you were never given access to. The live test is what keeps you there once the work is yours.'
    },
    tracks: [
      {
        label: 'Send the report',
        note: 'Minutes, no access needed',
        steps: [
          {
            label: 'Paste their URL',
            body: 'Any public landing page. We load it, measure it, and study two to three real competitors in their market.'
          },
          {
            label: 'Read the teardown',
            body: 'A measured readout of the page, then ranked fixes across flow, copy and discoverability, each with the replacement copy written.'
          },
          {
            label: 'Send it as yours',
            body: 'Share the link or hand over the printed version. On a paid plan there is nothing on it that says us.'
          }
        ]
      },
      {
        label: 'Prove the lift',
        note: 'After the contract',
        steps: [
          {
            label: 'Drop one script tag',
            body: 'Once you have access to the client site, one line runs the test. No redeploy and no change to their code.'
          },
          {
            label: 'Pick a window',
            body: 'Choose 7, 14, or 30 days. Significance is read once at the finish line, so nobody calls a winner early.'
          },
          {
            label: 'Show the verdict',
            body: 'The test closes into conversion lift, statistical significance and a plain recommendation. That is your renewal conversation.'
          }
        ]
      }
    ],

    value: {
      eyebrow: 'What you get',
      heading: 'A document that argues for itself.'
    },
    proof: [
      {
        title: 'Measured, not asserted',
        body: 'The readout counts what is on the page: form fields, calls to action above the fold, load time, images with no alt text. Numbers we took, never numbers a model guessed.'
      },
      {
        title: 'Finished copy, not prompts',
        body: 'Every ranked fix carries the replacement copy and the reasoning behind it. Add a brief about the business and it comes back with their real details already in it.'
      },
      {
        title: 'Yours to send',
        body: 'A paid report has no logo of ours, no waitlist wall, and nothing blurred. Paste the link in an email or hand over the printed version.'
      }
    ],

    // Replaced the pricing table. See the comment at its call site in app/(app)/page.tsx: the deal
    // is negotiated by a person, and a published self-serve number anchors that conversation before
    // it starts. Nothing here quotes a price.
    contact: {
      eyebrow: 'Talk to us',
      heading: 'Tell us how many pages you audit a month.',
      body: 'We will show you a real report on a page of your choosing, and what it costs to send it under your own name. No deck.',
      points: [
        'Reports with your name on them, not ours',
        'Your client never sees a signup wall',
        'One measured readout per page, not a template',
        'We answer the same day'
      ],
      form: {
        emailPlaceholder: 'you@agency.com',
        phonePlaceholder: 'Phone (optional)',
        join: 'Ask for a report',
        joining: 'Sending...',
        done: 'Got it. We will reply to that address today.',
        error: 'Something went wrong. Please try again.'
      }
    },

    finalCta: {
      heading: 'Pick a prospect. Run the report. See what you would have sent.'
    }
  },

  signIn: {
    title: 'Sign in',
    description: 'Continue with your Google account',
    google: 'Continue with Google',
    adminEmail: 'Admin email',
    password: 'Password',
    invalidCredentials: 'Invalid credentials',
    adminSubmit: 'Sign in as admin'
  },

  dashboard: {
    eyebrow: 'Dashboard',
    title: 'Your analyses',
    hintLabel: 'How analysis works',
    hint: 'Paste your live landing page URL. Hunch scans the copy, studies competitors, and generates ranked A/B test ideas. Add *business details* so the copy comes back finished instead of with [placeholders]. On paid plans, paste competitor URLs (*Competitor mode*) to ground the ideas; free analyses find competitors automatically.',
    subtitle: 'Paste a landing page URL to generate ranked A/B test hypotheses.',
    emptyTitle: 'No analyses yet',
    emptyDescription: 'Paste a landing page URL above to run your first analysis.'
  },

  urlForm: {
    phases: [
      'Scraping your page...',
      'Researching competitors...',
      'Writing your test ideas...',
      'Saving results...'
    ],
    urlPlaceholder: 'https://your-landing-page.com',
    analyze: 'Analyze',
    analyzing: 'Analyzing...',
    waitNote: 'This usually takes 2 to 3 minutes. Keep this tab open while we scrape the page, study competitors, and write your tests.',
    briefSummary: 'Add business details (optional)',
    briefPlaceholder: "Who it's for, your real numbers (users, trial length, pricing), and what makes you different. We use these to write finished copy instead of placeholders.",
    competitorSummary: 'Competitor mode',
    competitorPaidOnly: '(Pro)',
    competitorHint: 'Paste up to {max} competitor landing pages to ground your hunches.',
    competitorPlaceholder: 'https://a-competitor.com',
    competitorLockedBefore: 'Ground your hunches on competitors you choose.',
    competitorLockedAfter: 'to unlock Competitor mode. Free analyses find competitors automatically.',
    errorInvalidUrl: 'Enter a valid URL, including https://',
    errorGeneric: 'Something went wrong. Please try again.',
    errorLimitReached: 'You have reached the free plan limit. Talk to us to keep analyzing.',
    errorUnsupportedUrl: 'That URL is not valid or supported.',
    errorScrapeFailed: 'We could not load that page. Check the URL and try again.',
    errorAnalyzeFailed: 'Something went wrong while analyzing. Please try again.'
  },

  usageBanner: {
    limitReached: 'Limit reached',
    almostOut: 'Almost out',
    // "3 *of* 5 analyses used this month." Lived under `billing` by accident of origin, and outlived
    // that whole subtree -- this component is the only thing that ever read it.
    usageOf: 'of',
    used: 'analyses used this month.',
    blockedNote: 'Talk to us to keep analyzing pages.',
    remainingNote: '{remaining} left before you hit the free limit.'
  },

  history: {
    openAria: 'Open analysis for {url}',
    deleteAria: 'Delete analysis for {url}'
  },

  analysis: {
    eyebrow: 'What to test',
    title: 'Your test ideas',
    hintLabel: 'How to use this screen',
    hint: 'Each tab is one kind of fix, ranked by likely impact. *Flow* and *SEO* are changes you ship by hand; *Copy* is the wording, and every idea there comes with the replacement already written. When you have access to the site and want to prove a change rather than argue it, the *Tests* tab is where you install the snippet and run one live test at a time.',
    report: 'Print report',
    backToDashboard: 'Back to dashboard',
    benchmarkedAgainst: 'Benchmarked against:',
    marketNote: '(market: {market})',
    copyReportLink: 'Copy report link',
    copyFailed: 'Could not copy',
    tabs: {
      flow: 'Flow',
      copy: 'Copy',
      seo: 'SEO',
      ai: 'Found by AI',
      tests: 'Tests'
    }
  },

  // The four fix-section subtrees are keyed by PLAYBOOK_SECTION, so FlowPlaybook reads
  // `dictionary[section]` with no mapping table in between.
  flow: {
    eyebrow: 'Fix the flow',
    title: 'Before you test the words',
    hintLabel: 'Why these have no test button',
    hint: 'These change the *structure* of your page, not one line of text, so there is nothing for the snippet to swap and nothing to A/B. Ship them by hand: they usually pay off more than any wording change, and they make the copy tests below cleaner to read.',
    stepsLabel: 'How to ship it',
    evidenceLabel: 'Why',
    count: {
      one: '{count} flow fix',
      other: '{count} flow fixes'
    }
  },

  // `flow`, `visibility`, `seo` and `ai` mirror each other key for key, because FlowPlaybook picks
  // one of the four subtrees by `section`. A key added to one has to be added to all of them or the
  // union access in the component stops typechecking.
  //
  // `visibility` is the combined section the print report still renders; `seo` and `ai` are the two
  // slices of those same rows that the tabbed surfaces render.
  visibility: {
    eyebrow: 'Get found',
    title: 'Can a search engine and an AI read this page',
    hintLabel: 'What this section checked',
    hint: 'These come from what your page *declares about itself* - its title, description, structured data, and what its robots.txt allows. We checked the page, *not* your search ranking: nothing here tells you where you rank or whether an AI mentions you today, only whether your page gives them what they need to find and quote you.',
    stepsLabel: 'How to ship it',
    evidenceLabel: 'Why'
  },

  seo: {
    eyebrow: 'Get found',
    title: 'What a search engine can read here',
    hintLabel: 'What this section checked',
    hint: 'These come from what your page *declares about itself* - its title, description, canonical, structured data, and what its robots.txt allows. We checked the page, *not* your search ranking: nothing here tells you where you rank or how much traffic you get, only whether your page gives a crawler what it needs to reach and read you.',
    stepsLabel: 'How to ship it',
    evidenceLabel: 'Why'
  },

  ai: {
    eyebrow: 'Found by AI',
    title: 'Can a language model quote this page',
    hintLabel: 'What this section checked',
    hint: 'An assistant answering a question about your category has to *read an answer off your page* to cite it. These are the things that make one findable: facts stated in text rather than locked inside an image, and questions answered where a model can see them. We checked the page, *not* what any model says today - nothing here tells you whether an AI mentions you right now.',
    stepsLabel: 'How to ship it',
    evidenceLabel: 'Why'
  },

  // The measured readout. Every string here describes WHAT WAS COUNTED and how -- never what the
  // number will produce. "Your LCP is 4.2s" is a measurement; "this is costing you 12% of signups"
  // is a promise nobody measured, and it is the sentence that would burn the report's credibility
  // the first time it did not come true.
  readout: {
    eyebrow: 'Measured on your page',
    title: 'What we counted',
    hintLabel: 'Where these numbers come from',
    hint: 'Everything here was *counted on your page* when we loaded it - nothing is estimated, averaged, or taken from a benchmark. Load times are measured from a data center on a clean connection, so treat them as *the best case*: a visitor on mobile sees slower than this, never faster.',
    groups: {
      structure: 'What the page asks of a visitor',
      metadata: 'What the page tells a machine',
      load: 'What the page costs to open'
    },
    // One label per READOUT_FINDING. The value is rendered beside it from the measurement, so these
    // stay neutral: the label names the thing, the number says how much.
    findings: {
      form_fields: 'Signup form fields',
      no_social_signin: 'Sign in with Google or GitHub',
      above_fold_ctas: 'Calls to action above the fold',
      nav_links: 'Navigation links out of the page',
      no_faq: 'Questions answered on the page',
      no_testimonials: 'Customer proof on the page',
      noindex: 'Blocked from search engines',
      no_meta_description: 'Meta description',
      h1_count: 'H1 headings',
      images_missing_alt: 'Images with no alt text',
      no_structured_data: 'Structured data',
      no_og_image: 'Social share image',
      lcp: 'Largest content painted',
      page_weight: 'Downloaded to open the page',
      request_count: 'Network requests'
    },
    presence: {
      yes: 'Yes',
      no: 'No'
    },
    // Rendered against `page_weight` alone: SCRAPE_ALLOWED_RESOURCE_TYPES blocks media, so a page
    // with a hero video really did transfer more than we measured. Understating is the safe
    // direction for a claim made to a stranger about their own site, but it has to be said out loud.
    atLeast: 'at least',
    units: {
      seconds: '{value}s',
      megabytes: '{value} MB'
    },
    comparison: {
      title: 'Your page next to the competitors you gave us',
      hint: 'Measured the same way on each page, at the same screen size.',
      you: 'Your page',
      metrics: {
        form_fields: 'Signup form fields',
        social_signin: 'Social sign in',
        above_fold_ctas: 'CTAs above the fold',
        nav_links: 'Navigation links'
      }
    }
  },

  hypothesisList: {
    manualSetup: 'Manual setup',
    testThisFirst: 'Test this first',
    recommendedChallenger: 'Recommended challenger',
    placeholderWarning: "Has [placeholders] - you'll replace them with your real details when you set up the test.",
    viewTest: 'View test',
    setUpTest: 'Set up test',
    sortLabel: 'Sort',
    sort: {
      impact: 'Impact',
      effort: 'Effort',
      quickWins: 'Quick wins'
    },
    filterLabel: 'Show',
    // Keyed by TargetFilter, so the component reads filter[option] with no mapping table. There is
    // no "hide finished" here: that was test state, and test state lives on the Tests tab.
    filter: {
      all: 'All',
      auto: 'Automatic',
      manual: 'Manual'
    },
    noMatches: 'No ideas match these filters.',
    resetFilters: 'Clear filters',
    backlog: {
      one: '{count} more idea',
      other: '{count} more ideas'
    }
  },

  embedSnippet: {
    title: 'Install the tracking snippet',
    body: 'Paste this once, just before the closing body tag on your landing page. It applies running variants and reports results back automatically.'
  },

  testList: {
    eyebrow: 'Prove it',
    title: 'Run a live test',
    hintLabel: 'What belongs on this tab',
    hint: 'Everything about running a test lives here, because it is the step you reach for *after* you have access to the site. Install the snippet once, then run one test at a time: the snippet shows the challenger to half the visitors and the result, not an opinion, decides the winner. Only ideas whose copy maps to a single element can run this way - the rest are shipped by hand from the other tabs.',
    empty: 'None of the ideas in this analysis map to a single element, so there is nothing the snippet can swap. Ship them by hand from the other tabs.'
  },

  runTest: {
    eyebrow: 'Run a test',
    hintLabel: 'How running a test works',
    hint: 'Your current copy is the *control*. Pick a *challenger*, edit it to fit your product (replace any [bracketed] placeholders with real details), and choose how long to run. On *Launch*, the snippet shows the challenger to half your visitors and tracks conversions. When the window ends we read the result once and recommend a winner.',
    backToIdeas: 'Back to ideas',
    relaunch: 'Run another test'
  },

  testRunner: {
    controlTitle: 'Control (your current copy)',
    challengerTitle: 'Challenger to test',
    variant: 'Variant {letter}',
    recommendedSuffix: ' (recommended)',
    writingAlternates: 'Writing alternates...',
    placeholderWarning: 'This copy still has [placeholders] like [trial length]. Replace them with your real details before launching, or your visitors will see the brackets.',
    goalTitle: 'What counts as a conversion',
    goalPlaceholder: 'a.cta',
    goalHelp: 'A click on this element is one conversion. Pick the button your visitors press when they convert, or paste your own CSS selector.',
    goalWarning: 'Without a goal this test records visitors but never conversions, so it can never produce a result.',
    testLength: 'Test length',
    days: '{days} days',
    launch: 'Launch test',
    launching: 'Launching...',
    gatedBefore: 'You already have a test running. Free plans run one at a time.',
    gatedAfter: 'to run more.',
    manualTarget: 'This idea is a manual setup: its copy does not map to a single element we can swap automatically, so it cannot run as a live text test. Apply the recommended copy on your page by hand.',
    alreadyRunning: 'This idea already has a live test. Stop it before launching another one.',
    error: 'Something went wrong launching the test.'
  },

  experimentPanel: {
    stop: 'Stop',
    discard: 'Discard',
    declareWinner: 'Declare winner',
    recommendation: 'Recommendation',
    copyReport: 'Copy report',
    downloadMd: 'Download .md',
    upgradeToExport: 'Talk to us to export',
    noGoal: 'No conversion goal set, so no conversions are being recorded. Stop this test and relaunch it with a goal to get a result.',
    notEnoughData: 'Not enough data yet.',
    finalizing: 'Finalizing...',
    endsIn: { one: 'Ends in {days} day', other: 'Ends in {days} days' },
    lift: 'lift',
    drop: 'drop',
    magnitude: '{value}% {direction}',
    significant: 'Significant: {magnitude} (p={pValue}).',
    notSignificant: '{magnitude} so far, not yet significant (p={pValue}).'
  },

  report: {
    backToTestIdeas: 'Back to test ideas',
    printHint: 'Press Ctrl or Cmd + P to save as PDF',
    teardown: 'Conversion teardown',
    plan: 'A/B test plan',
    landingPageAnalyzed: 'Landing page analyzed',
    heading: '{count} tests to lift your conversion, ranked by impact.',
    testsFound: 'Tests found',
    quickWins: 'Quick wins',
    topImpact: 'Top impact',
    generated: 'Generated',
    benchmarkedAgainst: 'Benchmarked against',
    testThisFirst: 'Test this first',
    problem: 'Problem',
    recommendation: 'Recommendation',
    current: 'Current',
    changeTo: 'Change to',
    placeholderNote: 'Contains [placeholders]. Swap in your real details before launching.',
    whyThisWorks: 'Why this works',
    manualSetup: 'Manual setup',
    manualSetupBody: 'This change touches a section that is not a single-line text swap, so an in-context preview is not available. Apply the recommended copy by hand.',
    appliedToYourPage: 'Applied to your page',
    previewAlt: 'Variant applied to the landing page',
    previewCta: 'See how this looks on your page',
    previewHint: 'We load your real page with this copy swapped in. Takes about {seconds} seconds.',
    previewLoading: 'Rendering your page...',
    previewUnavailable:
      'We could not render your page just now. The recommended copy above still stands.',
    previewRetry: 'Try again',
    footerQuestion: 'Want these measured live on your page?',
    generatedBy: 'Generated by Hunch'
  },

  waitlist: {
    seeMore: 'See more',
    heading: {
      one: '{count} more high-impact test is ready',
      other: '{count} more high-impact tests are ready'
    },
    body: 'Join the waitlist to unlock the full teardown, the recommended copy for every section, and live A/B testing on your page.',
    done: 'You are on the list. We will be in touch.',
    emailPlaceholder: 'you@company.com',
    phonePlaceholder: 'Phone (optional)',
    join: 'Join the waitlist',
    joining: 'Joining...',
    error: 'Something went wrong. Please try again.'
  },

  // No self-serve checkout to send anyone to any more: every one of these leads to the contact
  // section on the landing page, because the deal is closed by a person now.
  upgradePrompt: {
    eyebrow: 'Pro',
    title: 'Send this report under your own name',
    body: 'On Pro the report carries no mark of ours and no signup wall, so you can hand it to a client. Unlimited analyses, competitor mode and export come with it.',
    dismiss: 'Not now',
    dismissAria: 'Dismiss upgrade prompt'
  },

  leads: {
    eyebrow: 'Admin',
    title: 'Waitlist leads',
    empty: 'No leads yet. They arrive from a public report wall or the contact form.',
    email: 'Email',
    source: 'Source',
    phone: 'Phone',
    fromReport: 'From report',
    joined: 'Joined'
  },

  export: {
    filename: 'ab-test-report.md',
    title: 'A/B test report',
    source: 'Source',
    section: 'Section',
    duration: 'Duration',
    days: 'days',
    recommendation: 'Recommendation',
    problem: 'Problem',
    result: 'Result',
    arm: 'Arm',
    copy: 'Copy',
    conversions: 'Conversions / Visitors',
    rate: 'Rate',
    uplift: 'Uplift',
    pValue: 'p-value',
    notAvailable: 'n/a'
  }
}

export type Dictionary = typeof en
