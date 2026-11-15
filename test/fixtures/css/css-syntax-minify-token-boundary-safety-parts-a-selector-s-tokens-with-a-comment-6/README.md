parts a selector's tokens with a comment rather than whitespace

Whitespace between two of a selector's tokens is a descendant combinator,

so the separator a fusing junction needs there is an empty comment: `a b`

would match what `a/**/b` (two adjacent type selectors) never does.

A comment the source spelled out where nothing would fuse still goes.

CSS Syntax 3 §4.3.10: a `+` starts a number only before a digit, or

before a `.` that itself has one — a class after it fuses with nothing.
