---
"webpack": minor
---

Minify HTML further: leave out the implied `<html>` tag and any optional end tag nothing prints behind, print an empty attribute value bare, drop an empty attribute and a run of nested empty elements, fold an enumerated value to lower case, and add the `optimization.minimize.html` options `collapseWhitespace`, `mergeStyles`, `minifyConditionalComments`, `preserveComments`, `removeEmptyAttributes`, `removeEmptyElements`, `removeImpliedTags`, `removeRedundantAttributes`, `sortAttributes` and `sortTokenLists`.
