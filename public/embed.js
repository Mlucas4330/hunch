(function () {
  var script = document.currentScript
  if (!script) return

  var key = script.getAttribute('data-key')
  if (!key) return

  var api = script.getAttribute('data-api') || new URL(script.src).origin

  // Served straight from public/, so this file can never import from lib/. The duplication below is
  // deliberate -- do not "fix" it. See docs/experiments.md.
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

  // Never hand back a drifted element to overwrite.
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
      }, LOCATE_TIMEOUT_MS)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attempt)
      return
    }
    attempt()
  }

  // Bucketing MUST stay after whenLocatable: a visit that could not be served must write no arm and
  // no impression, or an A/A test reports as a real result. See docs/experiments.md.
  function run(exp) {
    whenLocatable(exp, function (el) {
      var arm = armFor(exp)
      if (arm === 'variant') el.textContent = exp.variantCopy

      var impKey = 'hunch_imp_' + exp.experimentId
      if (!store(impKey)) {
        remember(impKey, '1')
        send(exp.experimentId, arm, 'impression')
      }

      // Never fall back to the swapped element: clicking a headline is not a conversion.
      if (!exp.goalSelector) return

      // Delegated from the document: a CTA rendered later would otherwise never carry a listener.
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
