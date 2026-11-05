writes the replacement character an escape at EOF names

§4.3.7: an escape the input ran out of is U+FFFD. Written back as the

`\\` it was, it would escape the `}` the printer closes the rule with —

so the value would read as `foo}` rather than `foo\uFFFD`.

§4.3.5 instead inside a string, where it names nothing at all.

The engine rewrites a string the input ran out in mid-escape, closed, so

the `}` written after it is the end of the rule, not more of the string.

A url token the input ran out of mid-escape holds a value its text no

longer spells, and the engine writes that value back closed — so the `}`

after it is not read as part of the url.

A `\\` with a character after it is an escape like any other, and an

even run is a pair of escaped backslashes.

---

prints what the escape names rather than the backslash

Printing the `\` would escape the `}` or `;` written after it, so a

second pass would read one construct where the first wrote one.
