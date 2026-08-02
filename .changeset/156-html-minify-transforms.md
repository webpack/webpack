---
"webpack": minor
---

Minify HTML further where the parsed document is unchanged: drop redundant attribute quotes, whitespace nothing renders, tags the parser re-implies and casing it folds, and rewrite `style`, `class`, `srcset`, viewport `content`, boolean attributes and inline `<style>` through their own grammars.
