---
"webpack": patch
---

Keep an inline `<style>` body's own trailing whitespace, so rebuilding a page
webpack emitted does not add a blank line before `</style>` each pass.
