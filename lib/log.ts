import type { LogEvent, LogLevel } from '@/lib/enums'

/**
 * One structured line per event, on stdout.
 *
 * The app had no observability at all: unstructured `console.error` in a handful of files, no
 * request ids, no levels, and **no number anywhere for the three things that actually bound
 * throughput** -- queue depth, browser slot wait, and job duration. Under paid traffic the failure
 * mode is not an exception, it is a queue that grows until `JOB_TTL_MS` expires under jobs that
 * never ran, and none of the old logging could see that happening.
 *
 * JSON rather than text because the consumer is a log search, not a person reading a terminal. It
 * writes to the console on purpose: Railway collects stdout, so a transport here would be a
 * dependency and a failure mode in exchange for nothing.
 *
 * **Logging never throws.** A serialization failure must not take down the work being logged, so
 * the emit is wrapped and a line that cannot be built is dropped.
 */

type Fields = Record<string, unknown>

function serializeError(error: unknown): Fields {
  if (error instanceof Error) {
    return { error: error.message, errorName: error.name, stack: error.stack }
  }

  return { error: String(error) }
}

function emit(level: LogLevel, event: LogEvent, fields?: Fields): void {
  try {
    const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...fields })

    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  } catch {
    // A field that cannot be serialized (a cycle, a BigInt) costs the line, never the caller.
  }
}

export const log = {
  info(event: LogEvent, fields?: Fields): void {
    emit('info', event, fields)
  },

  warn(event: LogEvent, fields?: Fields): void {
    emit('warn', event, fields)
  },

  /**
   * `error` is separate from the other two only in taking the thrown value, because every call site
   * that had one was formatting it differently.
   */
  error(event: LogEvent, error?: unknown, fields?: Fields): void {
    emit('error', event, error === undefined ? fields : { ...fields, ...serializeError(error) })
  }
}
