(function () {
  // Served straight from public/, so this file can never import from lib/. The duplication below is
  // deliberate -- do not "fix" it. See docs/experiments.md.
  var LOCATE_TIMEOUT_MS = 3000
  // Upper bound on waiting for the main thread to go quiet, and the delay used where
  // requestIdleCallback does not exist. See whenSettled.
  var SETTLE_TIMEOUT_MS = 2000
  var SETTLE_FALLBACK_MS = 250
  var SETTLE_MAX_MS = 4000
  // Mirrors GOAL_TARGET_SELECTOR in lib/constants.ts.
  var GOAL_TARGET_SELECTOR = '[data-ab-goal]'

  var script = document.currentScript
  var debug = !!(script && script.getAttribute('data-debug') !== null)

  // Neutral by default: these land in the console of a client's site, and the report this belongs to
  // may be white-labelled. Only the opt-in debug mode names the product. See docs/experiments.md.
  var PREFIX = debug ? '[hunch]' : '[ab]'

  function warn(message) {
    try {
      console.warn(PREFIX + ' ' + message)
    } catch {}
  }

  function log(message) {
    if (!debug) return
    try {
      console.info(PREFIX + ' ' + message)
    } catch {}
  }

  if (!script) {
    warn('must be loaded as a plain <script src> tag; document.currentScript was empty')
    return
  }

  var key = script.getAttribute('data-key')
  if (!key) {
    warn('missing data-key attribute, so there is nothing to load')
    return
  }

  var api = script.getAttribute('data-api') || new URL(script.src).origin

  function store(name) {
    try {
      return window.localStorage.getItem(name)
    } catch {
      return null
    }
  }

  function remember(name, value) {
    try {
      window.localStorage.setItem(name, value)
    } catch {}
  }

  // The server dedupes on this. Blocked storage loses dedupe for that visitor rather than
  // dropping the event.
  function visitor() {
    var id = store('hunch_vid')
    if (!id) {
      id =
        window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
              var r = (Math.random() * 16) | 0
              return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
            })
      remember('hunch_vid', id)
    }
    return id
  }

  function send(experimentId, arm, type) {
    var body = JSON.stringify({
      key: key,
      experimentId: experimentId,
      arm: arm,
      type: type,
      visitorId: visitor()
    })
    log('sending ' + type + ' for ' + experimentId + ' (' + arm + ')')
    try {
      // A false return means the beacon was never queued; fetch is the fallback.
      if (
        navigator.sendBeacon &&
        navigator.sendBeacon(api + '/api/track/event', new Blob([body], { type: 'text/plain' }))
      ) {
        return
      }
    } catch {}
    fetch(api + '/api/track/event', { method: 'POST', body: body, keepalive: true }).catch(
      function () {
        warn('could not report a ' + type + '; check that connect-src allows ' + api)
      }
    )
  }

  var SKIP = { script: 1, style: 1, noscript: 1, svg: 1, head: 1, meta: 1, link: 1, title: 1 }
  var INLINE = {
    span: 1, a: 1, strong: 1, em: 1, b: 1, i: 1, u: 1, s: 1, mark: 1, small: 1, sub: 1, sup: 1,
    code: 1, abbr: 1, time: 1, cite: 1, q: 1, kbd: 1, samp: 1, var: 1, ins: 1, del: 1, wbr: 1,
    br: 1, bdi: 1, bdo: 1, font: 1, svg: 1, img: 1, picture: 1, label: 1
  }

  function normalize(text) {
    return (text || '').replace(/\s+/g, ' ').trim().toLowerCase()
  }

  // A block element whose only element children are inline, so its text is one coherent string --
  // mirroring how the scraper captured it.
  function isTextUnit(el) {
    var kids = el.children
    for (var i = 0; i < kids.length; i++) {
      if (!INLINE[kids[i].tagName.toLowerCase()]) return false
    }
    return true
  }

  function findByText(text) {
    var target = normalize(text)
    if (!target) return null
    var nodes = document.querySelectorAll('*')
    for (var i = 0; i < nodes.length; i++) {
      if (SKIP[nodes[i].tagName.toLowerCase()]) continue
      if (!isTextUnit(nodes[i])) continue
      if (normalize(nodes[i].textContent) === target) return nodes[i]
    }
    return null
  }

  // Matches the element still holding the CONTROL copy, which is what makes it safe to call
  // repeatedly: once the variant is in place there is nothing left to find.
  // Never hand back a drifted element to overwrite.
  function locate(exp) {
    var target = normalize(exp.controlCopy)
    if (exp.selector) {
      try {
        var el = document.querySelector(exp.selector)
        if (el && normalize(el.textContent) === target) return el
      } catch {
        log('selector for ' + exp.experimentId + ' is not valid CSS, falling back to text')
      }
    }
    return findByText(exp.controlCopy)
  }

  // A PORT OF `applyVariantCopy` IN lib/scrape.ts. The two must stay in step: that one renders the
  // variant preview an agency shows its client, this one renders it to live visitors, and a
  // divergence means the preview is a picture of something no visitor ever saw. This file cannot
  // import from lib/, which is the only reason the logic is written twice. See docs/experiments.md.
  //
  // Nothing here removes a node. `textContent` would delete every child, and a framework still
  // holding references to those children throws "Failed to execute 'removeChild' on 'Node'" on the
  // next unmount, taking the host page down -- which the fail-safe rule forbids. So a headline split
  // across pieces ("Ship <span>faster</span>") keeps every piece, and the variant's words are shared
  // out across them by weight, leaving each styled fragment with something in it.
  var SKIP_TEXT = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1 }

  function swapText(el, text) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null)
    var nodes = []
    for (var node = walker.nextNode(); node; node = walker.nextNode()) {
      var parent = node.parentNode
      if (parent && SKIP_TEXT[parent.tagName]) continue
      // Whitespace-only nodes are skipped, or words written into them glue onto their neighbours.
      if (!(node.nodeValue || '').trim()) continue
      nodes.push(node)
    }

    var words = text.split(/\s+/).filter(Boolean)

    if (!nodes.length) {
      el.appendChild(document.createTextNode(text))
      return
    }

    var weights = []
    var total = 0
    for (var w = 0; w < nodes.length; w++) {
      weights.push((nodes[w].nodeValue || '').trim().length)
      total += weights[w]
    }
    if (!total) total = nodes.length

    var taken = 0
    var wrote = false

    for (var i = 0; i < nodes.length; i++) {
      var value = nodes[i].nodeValue || ''
      var leadMatch = value.match(/^\s*/)
      var lead = (leadMatch && leadMatch[0]) || (wrote ? ' ' : '')
      var trailMatch = value.match(/\s*$/)
      var trail = trailMatch ? trailMatch[0] : ''

      var remaining = words.length - taken
      var reserve = Math.min(nodes.length - i - 1, remaining)
      var ceiling = remaining - reserve
      var share = Math.round((words.length * weights[i]) / total)
      var take =
        i === nodes.length - 1
          ? remaining
          : Math.min(ceiling, Math.max(ceiling > 0 ? 1 : 0, share))

      var chunk = words.slice(taken, taken + take).join(' ')
      taken += take
      wrote = wrote || chunk.length > 0
      nodes[i].nodeValue = chunk ? lead + chunk + trail : ''
    }
  }

  function armFor(exp) {
    var name = 'hunch_exp_' + exp.experimentId
    var arm = store(name)
    if (arm !== 'control' && arm !== 'variant') {
      arm = Math.random() * 100 < exp.splitPercent ? 'variant' : 'control'
      remember(name, arm)
    }
    return arm
  }

  // Navigation is not paint: a client-rendered page reaches this script holding only a skeleton, so
  // locating once and giving up would silently drop every SPA.
  function whenLocatable(exp, cb) {
    function attempt() {
      var el = locate(exp)
      if (el) return cb(el)

      var timer = null
      var observer = new MutationObserver(function () {
        var found = locate(exp)
        if (!found) return
        observer.disconnect()
        clearTimeout(timer)
        cb(found)
      })
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      timer = setTimeout(function () {
        observer.disconnect()
        warn(
          'could not find the text this test rewrites, so it was skipped. ' +
            'The copy on the page has probably changed since the analysis ran.'
        )
      }, LOCATE_TIMEOUT_MS)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attempt)
      return
    }
    attempt()
  }

  // A framework that re-renders the swapped node puts the control copy back while the visitor stays
  // bucketed in the variant arm -- an A/A test reported as a real result, which is the same failure
  // the bucket-after-locate rule exists to prevent. So the swap is re-asserted for the life of the
  // page. See docs/experiments.md.
  //
  // The common case is O(1): the node we wrote is still attached and still holds the variant copy,
  // so nothing scans. Only a detached or reverted node pays for locate().
  function keepApplied(exp, el) {
    var current = el
    var scheduled = false

    function reassert() {
      scheduled = false
      if (current && document.contains(current)) {
        if (normalize(current.textContent) === normalize(exp.variantCopy)) return
      }

      var found = locate(exp)
      if (!found) return

      swapText(found, exp.variantCopy)
      current = found
      log('re-applied the variant for ' + exp.experimentId + ' after the page reverted it')
    }

    var observer = new MutationObserver(function () {
      if (scheduled) return
      scheduled = true
      // Coalesced to one check per painted frame: our own write re-enters this observer, and a busy
      // page would otherwise re-scan per mutation.
      window.requestAnimationFrame(reassert)
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  }

  // Swapping before the page's framework hydrates makes the server HTML and the client tree
  // disagree, and React answers a mismatch by throwing away the server's markup and regenerating the
  // whole subtree -- a console error on someone else's site plus a full client re-render. Waiting for
  // the main thread to go quiet lets hydration finish first, after which the same write is an
  // ordinary DOM mutation the framework tolerates.
  //
  // The cost is that the original copy stays visible a little longer, which is the tradeoff already
  // accepted below. See docs/experiments.md.
  // Idle alone is not enough: before the framework's bundle has even executed the main thread is
  // already quiet, so requestIdleCallback fires *ahead* of hydration and the mismatch happens
  // anyway. Waiting for `load` first puts us after the scripts have run, and the idle callback then
  // waits out the hydration work itself. SETTLE_MAX_MS caps the whole thing, because `load` also
  // waits for images and a slow one must not hold the test hostage.
  function whenSettled(cb) {
    var done = false

    function once() {
      if (done) return
      done = true
      cb()
    }

    function idle() {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(once, { timeout: SETTLE_TIMEOUT_MS })
        return
      }
      window.setTimeout(once, SETTLE_FALLBACK_MS)
    }

    window.setTimeout(once, SETTLE_MAX_MS)

    if (document.readyState === 'complete') {
      idle()
      return
    }
    window.addEventListener('load', idle)
  }

  // Bucketing MUST stay after whenLocatable: a visit that could not be served must write no arm and
  // no impression, or an A/A test reports as a real result. See docs/experiments.md.
  function run(exp) {
    whenLocatable(exp, function () {
      // BOTH arms wait for the same moment. Bucketing at locate time and swapping after the wait
      // would count a visitor who left in between as variant while they only ever saw the control;
      // counting control early and variant late biases the sample the same way, one arm at a time.
      whenSettled(function () {
        served(exp)
      })
    })
  }

  function served(exp) {
    var el = locate(exp)
    if (!el) return

    var arm = armFor(exp)
    if (arm === 'variant') {
      swapText(el, exp.variantCopy)
      keepApplied(exp, el)
    }
    log('experiment ' + exp.experimentId + ' -> ' + arm)

    var impKey = 'hunch_imp_' + exp.experimentId
    if (!store(impKey)) {
      remember(impKey, '1')
      send(exp.experimentId, arm, 'impression')
    }

    // Never fall back to the swapped element: clicking a headline is not a conversion. The goal is
    // whatever the site owner marked, and nothing else -- so if they marked nothing, say so. The
    // launch is meant to have been refused before this, which makes reaching it worth reporting.
    if (!document.querySelector(GOAL_TARGET_SELECTOR)) {
      warn(
        'nothing on this page carries the ' +
          GOAL_TARGET_SELECTOR +
          ' attribute, so a conversion cannot be recorded. Add it to the element a visitor clicks ' +
          'when they convert.'
      )
    }

    // Warned, not skipped: the listener is delegated from the document precisely because the element
    // can arrive later, and on a client-rendered page it often has not appeared yet.
    document.addEventListener('click', function (event) {
      var target = event.target
      if (!target || !target.closest) return
      if (!target.closest(GOAL_TARGET_SELECTOR)) return

      var convKey = 'hunch_conv_' + exp.experimentId
      if (store(convKey)) return
      remember(convKey, '1')
      send(exp.experimentId, arm, 'conversion')
    })
  }

  fetch(api + '/api/track/config?key=' + encodeURIComponent(key))
    .then(function (res) {
      return res.json()
    })
    .then(function (data) {
      var experiments = data.experiments || []
      if (!experiments.length) {
        log('no running experiments for this key')
        return
      }
      experiments.forEach(function (exp) {
        try {
          run(exp)
        } catch {
          warn('a running test could not be applied and was skipped')
        }
      })
    })
    .catch(function () {
      warn(
        'could not reach ' + api + '. If the site sends a Content-Security-Policy, ' +
          'it must allow this origin in both script-src and connect-src.'
      )
    })
})()
