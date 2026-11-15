a basic shape's default arguments

A substitution may stand for any of the parts, so none is dropped.

Engines read the position back as written, so dropping the centre

would change what `getComputedStyle()` reports.

No length, so the engine drops the declaration a drop would bring back.

`rect()` reads its four values by position, not as a box.

`offset-path` and `shape-outside` take no fill rule in `path()`.
