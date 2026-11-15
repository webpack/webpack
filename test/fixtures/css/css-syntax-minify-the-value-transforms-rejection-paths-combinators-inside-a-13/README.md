combinators inside a selector function

The same trim reaches a selector wherever one is applied.

`+` and `-` are operators only with whitespace on both sides.

The one argument a function carries is a whitespace token, which

separates nothing — so the parentheses close on nothing at all.

The selector is under test, so no universal or pseudo name is rewritten.

`element()` takes an id selector, but in a value there is no combinator

to trim and the argument is a reference.
