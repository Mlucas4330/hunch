#!/bin/sh
set -e

# Chrome keeps its default loopback bind and socat owns the reachable port. Two reasons this is a
# forwarder rather than --remote-debugging-address: that flag binds a single family, and Railway's
# internal DNS answers IPv6, so an IPv4 bind is refused; and Chrome ignores the flag often enough
# that a deploy silently comes up listening on 127.0.0.1 anyway.
#
# ipv6only=0 makes the v6 socket accept IPv4-mapped clients too, so this works whichever family
# lookup() picks on the app side. retry covers socat winning the race against Chrome's startup.
socat TCP6-LISTEN:9222,fork,reuseaddr,ipv6only=0 TCP4:127.0.0.1:9223,retry=30,interval=1 &

# --remote-allow-origins is what lets puppeteer.connect complete its WebSocket upgrade. It is quoted
# because an unquoted * is a glob to sh.
#
# --no-sandbox is here because Chrome's sandbox needs user namespaces, whose clone/unshare syscalls
# Docker's default seccomp profile blocks, and Railway does not support attaching a custom profile
# (security_opt). On a host that does, the fix is that profile -- not this flag. The mitigation for
# running without it is the empty environment of this container, plus rebuilding the image regularly
# so the Chromium underneath stays patched.
exec chromium \
  --headless=new \
  --remote-debugging-port=9223 \
  '--remote-allow-origins=*' \
  --no-sandbox \
  --disable-setuid-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --no-first-run \
  --no-default-browser-check
