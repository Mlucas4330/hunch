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

  function findByText(text) {
    var target = text.replace(/\s+/g, ' ').trim()
    var nodes = document.querySelectorAll('h1,h2,h3,h4,p,a,button,span,li')
    for (var i = 0; i < nodes.length; i++) {
      if ((nodes[i].textContent || '').replace(/\s+/g, ' ').trim() === target) return nodes[i]
    }
    return null
  }

  function locate(exp) {
    var el = null
    if (exp.selector) {
      try {
        el = document.querySelector(exp.selector)
      } catch (e) {}
    }
    return el || findByText(exp.controlCopy)
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
