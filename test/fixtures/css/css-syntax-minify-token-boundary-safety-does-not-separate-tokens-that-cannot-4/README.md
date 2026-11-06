does not separate tokens that cannot fuse

A comment is not whitespace, so `.a/**/.b` stays the compound `.a.b` —

inserting a space here would silently make it a descendant selector.

The whitespace around a `+` is what makes it an operator (CSS Values 4

§10.1) — `1em+2px` is not an expression. Two units that cannot be added

here, so the folding leaves the spacing to be judged on its own.

---

combinators inside a selector function

The same trim reaches a selector wherever one is applied.

`+` and `-` are operators only with whitespace on both sides.

The one argument a function carries is a whitespace token, which

separates nothing — so the parentheses close on nothing at all.

The selector is under test, so no universal or pseudo name is rewritten.

`element()` takes an id selector, but in a value there is no combinator

to trim and the argument is a reference.
