(function () {
  var script = document.currentScript
  if (!script) return

  var key = script.getAttribute('data-key')
  if (!key) return

  var api = script.getAttribute('data-api') || new URL(script.src).origin

  // How long to keep waiting for a client-rendered page to paint the control copy before giving up
  // on this experiment. Local to this file on purpose: it is served straight from public/ and can
  // never import from lib/.
  var LOCATE_TIMEOUT_MS = 3000

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

  // A stable per-browser id. The server dedupes on it, so a reload -- or a replayed beacon --
  // counts once instead of inflating the arm. Falls back to a fresh id when storage is blocked,
  // which loses dedupe for that visitor rather than dropping the event.
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
    try {
      // A false return means the beacon was never queued (the queue is full, the payload is too
      // big). Falling through to fetch is the difference between a dropped event and a counted one.
      if (
        navigator.sendBeacon &&
        navigator.sendBeacon(api + '/api/track/event', new Blob([body], { type: 'text/plain' }))
      ) {
        return
      }
    } catch {}
    fetch(api + '/api/track/event', { method: 'POST', body: body, keepalive: true }).catch(
      function () {}
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

  // A "text unit" is a block-level element whose only element children are inline formatting, so its
  // full text is one coherent string -- mirroring how the scraper captured it.
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

  // Only return an element we are confident is the control: a stored selector still pointing at the
  // original copy, else an exact full-text match. Never hand back a drifted element to overwrite.
  function locate(exp) {
    var target = normalize(exp.controlCopy)
    if (exp.selector) {
      try {
        var el = document.querySelector(exp.selector)
        if (el && normalize(el.textContent) === target) return el
      } catch {}
    }
    return findByText(exp.controlCopy)
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

  // Navigation is not paint. A client-rendered page reaches this script with nothing but a skeleton
  // in the DOM, so locating once and giving up would silently drop every SPA. Waits for the document
  // to stop being parsed, then watches for the control copy to appear, bounded so a page that never
  // renders it costs one timer rather than a permanent observer.
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
      }, LOCATE_TIMEOUT_MS)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attempt)
      return
    }
    attempt()
  }

  // An impression only exists once the page is confirmed to be in the state the test assumes. If the
  // control copy is not on the page, the visitor could never have been shown the challenger, and
  // counting them into the variant arm would report an A/A test as a real result -- with a real
  // looking rate, p-value and recommendation on top of it. Bucketing happens after that check for
  // the same reason: an arm written to localStorage here would stick for every later visit too.
  function run(exp) {
    whenLocatable(exp, function (el) {
      var arm = armFor(exp)
      if (arm === 'variant') el.textContent = exp.variantCopy

      var impKey = 'hunch_imp_' + exp.experimentId
      if (!store(impKey)) {
        remember(impKey, '1')
        send(exp.experimentId, arm, 'impression')
      }

      // A conversion is only ever a click on the declared goal. Never fall back to the swapped
      // element -- clicking a headline is not a conversion, and counting it would quietly poison
      // the result with numbers that look real.
      if (!exp.goalSelector) return

      // Delegated from the document rather than bound to the element: a CTA rendered later -- by a
      // modal, by hydration, by infinite scroll -- would otherwise never carry a listener, and the
      // test would collect impressions forever without a single conversion.
      document.addEventListener('click', function (event) {
        var target = event.target
        if (!target || !target.closest) return
        try {
          if (!target.closest(exp.goalSelector)) return
        } catch {
          return
        }
        var convKey = 'hunch_conv_' + exp.experimentId
        if (store(convKey)) return
        remember(convKey, '1')
        send(exp.experimentId, arm, 'conversion')
      })
    })
  }

  fetch(api + '/api/track/config?key=' + encodeURIComponent(key))
    .then(function (res) {
      return res.json()
    })
    .then(function (data) {
      ;(data.experiments || []).forEach(function (exp) {
        try {
          run(exp)
        } catch {}
      })
    })
    .catch(function () {})
})()
