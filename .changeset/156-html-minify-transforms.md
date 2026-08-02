---
"webpack": minor
---

Minify HTML further where the parsed document is unchanged: drop redundant attribute quotes, whitespace nothing renders, tags the parser re-implies and casing it folds, and rewrite `style`, token lists, `srcset`, `sizes`, URL and integer attributes, viewport `content`, boolean attributes, inline `<style>` and a JSON `<script>` body through their own grammars.
