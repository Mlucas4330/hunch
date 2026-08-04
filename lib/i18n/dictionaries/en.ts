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
      billing: {
        title: 'Plans & usage',
        description: 'Manage your Hunch plan and see this month usage.'
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
    upgrade: 'Upgrade',
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
      page_structure: 'Page Structure'
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
    plan: {
      free: 'Free',
      solo: 'Solo'
    }
  },

  nav: {
    homeAria: 'Hunch home',
    dashboard: 'Dashboard',
    billing: 'Billing',
    signIn: 'Sign in',
    signOut: 'Sign out',
    account: 'Account',
    languageAria: 'Language'
  },

  footer: {
    poweredBy: 'Powered by'
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
    eyebrow: 'Conversion instrument for micro-SaaS',
    headlineTop: 'Find what costs you signups.',
    headlineBottom: 'Prove the fix when you want.',
    lead: 'Paste your URL. Get the A/B tests worth running, ranked and already written.',
    cta: 'Analyze your landing page',
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
      heading: 'The problem was never effort. It was knowing where to point it.'
    },
    pains: [
      {
        headline: 'Your traffic is too low to test everything.',
        reality: 'A few hundred visitors a week buys you maybe one experiment a month. Pick the wrong one and you learn nothing.',
        answer: 'Every hunch is ranked by predicted impact, so your one shot lands where it moves revenue.'
      },
      {
        headline: "There is no growth team. It's you, at 11pm.",
        reality: 'No CRO, no copywriter, no backlog of experiments. Just you and a page you have read a thousand times.',
        answer: 'Paste the URL once. Get five to eight tests written for you, variant copy included.'
      },
      {
        headline: 'You never know where to start.',
        reality: 'You know conversion matters. Every guide says "just test." None of them say what to test first.',
        answer: 'Hunch turns the blank page into an ordered path: headline, then CTA, then proof.'
      }
    ],

    how: {
      eyebrow: 'How it works',
      heading: 'Take the plan and go. Or stay and prove it.',
      intro: 'Two ways to use Hunch. Take the report: real competitors researched for you, plus ranked tests with finished variant copy you apply yourself. Or add one script tag and let Hunch run the A/B test live and measure the lift.'
    },
    tracks: [
      {
        label: 'Get the plan',
        note: 'Minutes, no code',
        steps: [
          {
            label: 'Paste your URL',
            body: 'Drop in your live landing page. Hunch scrapes the copy and studies two to three real competitors in your space.'
          },
          {
            label: 'Get ranked hunches',
            body: 'Five to eight A/B tests, ordered by impact, each with variant copy and the competitor pattern it borrows.'
          },
          {
            label: 'Ship or share the report',
            body: 'Rewrite the page yourself today, export the report, or send the shareable link to whoever owns the copy.'
          }
        ]
      },
      {
        label: 'Prove it live',
        note: 'Optional',
        steps: [
          {
            label: 'Drop one script tag',
            body: 'Pick a hunch and paste a single line on your page. Hunch shows the variant to half your visitors, no redeploy or code changes.'
          },
          {
            label: 'Pick a window',
            body: 'Choose 7, 14, or 30 days. Significance is read once at the finish line, so you never chase a false winner.'
          },
          {
            label: 'Read the verdict',
            body: 'The test auto-closes into a report: conversion lift, statistical significance, and a plain recommendation.'
          }
        ]
      }
    ],

    value: {
      eyebrow: 'What you get',
      heading: 'A plan you can act on today. Proof when you want it.'
    },
    proof: [
      {
        title: 'Ranked, not brainstormed',
        body: 'Every hunch carries an impact and effort score and the competitor pattern behind it, so the list itself tells you what to do first.'
      },
      {
        title: 'Finished copy, not prompts',
        body: 'Each hunch comes with variant copy you can paste straight onto the page. Add a business brief and it comes back with your real numbers in it.'
      },
      {
        title: 'Proof when you want it',
        body: 'Turn any hunch into a live, timed test with one script tag. It closes into conversion lift, significance, and a plain recommendation.'
      }
    ],

    pricing: {
      eyebrow: 'Pricing',
      heading: 'Start free. Upgrade when this becomes a habit.',
      mostPopular: 'Most popular',
      perMonth: '/mo',
      startFree: 'Start free',
      choose: 'Choose {plan}',
      footnote: 'Cancel anytime'
    },
    plans: {
      free: {
        line: 'Get a full ranked report on your own page.',
        features: [
          '{limit} full reports / month',
          'Ranked hunches with variant copy',
          'Shareable report link',
          '1 live test at a time'
        ]
      },
      solo: {
        line: 'For the founder who ships every week.',
        features: [
          'Unlimited reports',
          'Full history, export to markdown',
          'Competitor mode',
          'Unlimited live tests'
        ]
      }
    },

    finalCta: {
      heading: 'Stop rereading your own copy. Start with a hunch.'
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
    competitorPaidOnly: '(Solo)',
    competitorHint: 'Paste up to {max} competitor landing pages to ground your hunches.',
    competitorPlaceholder: 'https://a-competitor.com',
    competitorLockedBefore: 'Ground your hunches on competitors you choose.',
    competitorLockedAfter: 'to unlock Competitor mode. Free analyses find competitors automatically.',
    errorInvalidUrl: 'Enter a valid URL, including https://',
    errorGeneric: 'Something went wrong. Please try again.',
    errorLimitReached: 'You have reached the free plan limit. Upgrade to keep analyzing.',
    errorUnsupportedUrl: 'That URL is not valid or supported.',
    errorScrapeFailed: 'We could not load that page. Check the URL and try again.',
    errorAnalyzeFailed: 'Something went wrong while analyzing. Please try again.'
  },

  usageBanner: {
    limitReached: 'Limit reached',
    almostOut: 'Almost out',
    used: 'analyses used this month.',
    blockedNote: 'Upgrade to keep analyzing pages.',
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
    hint: 'Each card is a test idea, ranked by likely impact. For each one the AI recommends the strongest *challenger* to try against your current copy. Pick one and press *Set up test* - you run one test at a time, and the live results (not your guess) decide the winner. Install the snippet once and every test runs behind it.',
    report: 'Report',
    backToDashboard: 'Back to dashboard',
    benchmarkedAgainst: 'Benchmarked against:',
    copyReportLink: 'Copy report link'
  },

  playbook: {
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
    filter: {
      all: 'All',
      auto: 'Automatic',
      manual: 'Manual',
      hideCompleted: 'Hide finished'
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

  runTest: {
    eyebrow: 'Run a test',
    hintLabel: 'How running a test works',
    hint: 'Your current copy is the *control*. Pick a *challenger*, edit it to fit your product (replace any [bracketed] placeholders with real details), and choose how long to run. On *Launch*, the snippet shows the challenger to half your visitors and tracks conversions. When the window ends we read the result once and recommend a winner.',
    backToIdeas: 'Back to ideas'
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
    error: 'Something went wrong launching the test.'
  },

  experimentPanel: {
    stop: 'Stop',
    discard: 'Discard',
    declareWinner: 'Declare winner',
    recommendation: 'Recommendation',
    copyReport: 'Copy report',
    downloadMd: 'Download .md',
    upgradeToExport: 'Upgrade to export',
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

  billing: {
    eyebrow: 'Billing',
    title: 'Plans & usage',
    usageCounter: 'analyses used this month',
    usageOf: 'of',
    perMonth: '/mo',
    manageBilling: 'Manage billing',
    currentPlan: 'Current plan',
    upgradeTo: 'Upgrade to {plan}',
    closeCheckoutAria: 'Close checkout'
  },

  leads: {
    eyebrow: 'Admin',
    title: 'Waitlist leads',
    empty: 'No leads yet. They arrive when someone submits the form on a public report.',
    email: 'Email',
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
