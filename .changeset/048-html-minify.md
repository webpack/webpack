---
"webpack": minor
---

Minify HTML further where the parsed document is unchanged: drop redundant quotes, whitespace nothing renders, escapes text does not need, implied tags, optional end tags nothing prints behind, empty attributes and nested empty elements; fold enumerated values and casing; normalize each attribute against the element it is on; and rewrite `style`, token lists, `srcset`, `sizes`, URL, integer and boolean attributes, viewport `content`, inline `<style>` and a JSON `<script>` body through their own grammars. Adds the `optimization.minimize.html` options `collapseWhitespace`, `mergeStyles`, `minifyConditionalComments`, `minifySrcdoc`, `preserveComments`, `removeEmptyAttributes`, `removeEmptyElements`, `removeImpliedTags`, `removeRedundantAttributes`, `sortAttributes` and `sortTokenLists`, and keeps an end tag the parent, the next element or the adoption agency would otherwise restructure the tree over.
