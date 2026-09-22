---
"webpack": patch
---

Regenerate the module header above an inline `<style>` sheet instead of heading
the one a previous build wrote, so rebuilding a page webpack emitted keeps one
header per sheet rather than a stack of them.
