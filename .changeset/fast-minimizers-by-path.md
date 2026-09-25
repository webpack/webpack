---
"webpack": patch
---

Use module paths for webpack's built-in minimizers so parallel minification can load them directly in workers instead of serializing their function sources.
