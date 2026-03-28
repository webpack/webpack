---
"webpack": patch
---

Fix `resolve.fallback` and `resolve.alias` not applying to `node:` prefixed imports (e.g. `import fs from "node:fs"`). The `node:` scheme is now stripped before alias/fallback resolution so that entries like `resolve.fallback: { fs: false }` correctly apply to both `"fs"` and `"node:fs"` imports.
