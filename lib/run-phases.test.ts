import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PHASE_STEPS, phasesFor } from './run-phases'
import { RUN_PHASE, RUN_STEP, type RunStep } from './enums'

// The waiting screen's four lines. Every case here is a moment a reader can actually be looking at
// the screen, and the rule under all of them is that a line says "done" only for work that landed.

const ALL_MEASURE = PHASE_STEPS.measure
const ALL_WRITE = PHASE_STEPS.write

test('every step belongs to exactly one line, and assemble owns none', () => {
  const grouped = RUN_PHASE.flatMap((phase) => [...PHASE_STEPS[phase]])

  assert.deepEqual([...grouped].sort(), [...RUN_STEP].sort())
  assert.equal(PHASE_STEPS.assemble.length, 0)
})

test('a run that has recorded nothing is opening the page', () => {
  const phases = phasesFor({ steps: [], measured: false, generated: false })

  assert.equal(phases.open, 'active')
  assert.equal(phases.measure, 'waiting')
  assert.equal(phases.write, 'waiting')
})

test('the page opened, and measuring is what is happening now', () => {
  const phases = phasesFor({ steps: ['open'], measured: false, generated: false })

  assert.equal(phases.open, 'done')
  assert.equal(phases.measure, 'active')
})

test('measuring is done only once the row was written, never on the calls alone', () => {
  const landed: RunStep[] = ['open', 'pagespeed', 'crawl', 'index']

  assert.equal(phasesFor({ steps: landed, measured: false, generated: false }).measure, 'active')
  assert.equal(phasesFor({ steps: landed, measured: true, generated: false }).measure, 'done')
})

test('writing runs after the measurement, and assembling is the last thing left', () => {
  const writing = phasesFor({ steps: ['open', ...ALL_MEASURE], measured: true, generated: false })
  assert.equal(writing.write, 'active')
  assert.equal(writing.assemble, 'waiting')

  const written = phasesFor({
    steps: ['open', ...ALL_MEASURE, ...ALL_WRITE],
    measured: true,
    generated: true
  })
  assert.equal(written.write, 'done')
  assert.equal(written.assemble, 'active')
})

// The state a deploy with no Redis, or a sick one, is always in. The screen has to keep moving.
test('with no steps at all the lines still advance on the stored facts', () => {
  const measuring = phasesFor({ steps: [], measured: false, generated: false })
  assert.equal(measuring.measure, 'waiting')

  const writing = phasesFor({ steps: [], measured: true, generated: false })
  assert.equal(writing.open, 'done')
  assert.equal(writing.measure, 'done')
  assert.equal(writing.write, 'active')

  const done = phasesFor({ steps: [], measured: true, generated: true })
  assert.equal(done.write, 'done')
})

test('a call that failed leaves its line short of done rather than filling it in', () => {
  // PageSpeed timed out: the other three landed and the measurement was written, so the line is done
  // on the row, and nothing on the screen ever claimed PageSpeed answered.
  const steps: RunStep[] = ['open', 'crawl', 'index', 'snapshot']

  assert.equal(phasesFor({ steps, measured: true, generated: false }).measure, 'done')
  assert.equal(phasesFor({ steps, measured: false, generated: false }).measure, 'active')
})
