CSS Syntax §9: where only a comment parts a `+` or `-` from the token it would
fuse with, `/**/` is written back: whitespace there makes the sign an operator,
so `calc(1px +/**/2px)` stays as invalid as it is written, a custom property too.
Whitespace beside the comment stays a space: `calc(1px +/**/ 2px)` is valid.
