does not separate tokens that cannot fuse

A comment is not whitespace, so `.a/**/.b` stays the compound `.a.b` —

inserting a space here would silently make it a descendant selector.

The whitespace around a `+` is what makes it an operator (CSS Values 4

§10.1) — `1em+2px` is not an expression. Two units that cannot be added

here, so the folding leaves the spacing to be judged on its own.
