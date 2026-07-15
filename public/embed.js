(function () {
  var script = document.currentScript
  if (!script) return

  var key = script.getAttribute('data-key')
  if (!key) return

  var api = script.getAttribute('data-api') || new URL(script.src).origin

  function store(name) {
    try {
      return window.localStorage.getItem(name)
    } catch (e) {
      return null
    }
  }

  function remember(name, value) {
    try {
      window.localStorage.setItem(name, value)
    } catch (e) {}
  }

  function send(experimentId, arm, type) {
    var body = JSON.stringify({ key: key, experimentId: experimentId, arm: arm, type: type })
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(api + '/api/track/event', new Blob([body], { type: 'text/plain' }))
        return
      }
    } catch (e) {}
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
      } catch (e) {}
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

  function run(exp) {
    var arm = armFor(exp)
    var el = locate(exp)

    if (arm === 'variant' && el) el.textContent = exp.variantCopy

    var impKey = 'hunch_imp_' + exp.experimentId
    if (!store(impKey)) {
      remember(impKey, '1')
      send(exp.experimentId, arm, 'impression')
    }

    var goal = null
    if (exp.goalSelector) {
      try {
        goal = document.querySelector(exp.goalSelector)
      } catch (e) {}
    }
    goal = goal || el
    if (!goal) return

    goal.addEventListener('click', function () {
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
      ;(data.experiments || []).forEach(function (exp) {
        try {
          run(exp)
        } catch (e) {}
      })
    })
    .catch(function () {})
})()
