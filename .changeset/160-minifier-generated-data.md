---
"webpack": patch
---

Generate every CSS and HTML lookup table into `lib/{css,html}/data.js`, the HTML ones distilled from the spec's IDL and the CSS ones now including the shorthand/longhand relation and the value-type facts read out of the value-definition grammars, leaving both `syntax.js` files algorithm only.
