#!/bin/sh
# The cron services' entire payload. It takes the route as $1 so both share one script.
#
# This exists as a file rather than an inline `sh -c "..."` startCommand because Railway runs a
# custom start command in exec form, without a shell: the inline version needs its quotes nested
# inside JSON, and getting that wrong sends curl the literal characters $CRON_SECRET. That failure
# arrives as a 401, which reads like a wrong secret rather than a quoting bug.
#
# --fail-with-body exits non-zero on a non-2xx while still printing the response, so a 401 or a 500
# shows up as a failed run in Railway with the reason in the log. It is safe here only because the
# two crons are separate services: in a single `curl A && curl B` it would have let a failed
# finalize skip the prune.
exec curl -sS --fail-with-body \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL$1"
