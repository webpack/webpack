---
"webpack": minor
---

Print every CSS name that matches ASCII case-insensitively in one case — a property, at-rule, function, `url()`, pseudo, media feature, media type, unit, and a keyword value on a property whose grammar takes no name of the author's — keeping the canonical spelling of the eleven transform functions and three units the spec capitalizes; and name each of the CSS and HTML minimizers' rewrites on `optimization.minimize.css` / `.html` (`colors`, `comments`, `escapes`, `functions`, `lowercase`, `mediaQueries`, `numbers`, `quotes`, `rules`, `selectors`, `shorthands`; `booleanAttributes`, `comments`, `enumeratedAttributes`, `listAttributes`, `minifyJson`, `minifyStyles`, `numericAttributes`, `optionalTags`, `quotes`, `urlAttributes`), so one a document trips over can be turned off while the rest still apply — `comments` taking the six forms terser's `format.comments` does. The tables both minimizers read are smaller by 116 KiB of retained heap.
