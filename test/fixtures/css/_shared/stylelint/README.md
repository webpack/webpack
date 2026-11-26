# Stylelint CSS inputs

These fixtures contain distinct CSS inputs from
[Stylelint](https://github.com/stylelint/stylelint) at commit
`6830965c2f536d4d557ec00c7534820dbb96bc10`. Preprocessor syntax and
CSS-in-JavaScript are excluded; CSS-only inputs from custom-syntax tests are
included.
The upstream MIT license is in `LICENSE`.

Where `fixed.css` is present, the invariant runner requires the input and
Stylelint's fix to produce the same minified CSS, retaining empty rules.
These comparisons cover hex colors, blank lines, redundant shorthand values,
zero-length units, keyframe selectors, pseudo-element colons and URL quotes.
The keyframe comparison excludes uppercase `TO`, which webpack preserves.
URL comparisons exclude escapes, which can retain different spellings.
