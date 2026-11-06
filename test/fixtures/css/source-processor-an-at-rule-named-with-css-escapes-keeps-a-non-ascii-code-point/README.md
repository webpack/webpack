keeps a non-ASCII code point inside the name it is written in

U+00A0 is an identifier code point, not CSS whitespace, so `@layer` and

`@layer\u00a0x` are two names rather than one rule and its prelude.
