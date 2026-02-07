---
"webpack": patch
---

Fix VirtualUrlPlugin Windows compatibility by sanitizing cache keys and filenames. Cache keys now use `toSafePath` to replace colons (`:`) with double underscores (`__`) and sanitize other invalid characters, ensuring compatibility with Windows filesystem restrictions.
