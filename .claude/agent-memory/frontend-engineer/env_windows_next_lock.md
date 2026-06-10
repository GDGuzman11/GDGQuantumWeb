---
name: env-windows-next-lock
description: On Windows, npm run build fails with EPERM on .next when a dev server is running; stop node + clear .next first
metadata:
  type: feedback
---

On this Windows 11 machine, `npm run build` can fail with `EPERM: operation not permitted, open '...\.next\trace'` (or similar) even though it prints `BUILD_EXIT=0`. The build did NOT actually complete.

**Why:** A `next dev` server (node.exe processes) holds a lock on the `.next` directory; the production build can't open/overwrite files there.

**How to apply:** Before running `npm run build` (or a clean rebuild), stop any running dev server and clear the dir:
- `Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`
- `Remove-Item -Recurse -Force ".next"`
Then build. Reading `.next/dev.log` while dev is running also hits "Permission denied" — poll the server with `curl` for HTTP 200 instead of tailing the log. Related: [[project-mobile-snap-decision]].
