%s

One input per switch, minified twice: everything on, and that one switch off —

so a guard that stops firing fails here rather than quietly making the rewrite

unconditional. `comments` is not a boolean; it has its own describe below.

A shorthand the longhands after it fold into is the same rewrite read

from the other end, and answers to the same switch.

Taking the `calc()` off a term that means the same bare is the last step

of the fold, not a separate one.

---

takes an absent option as every rewrite on

A walk that does not print holds every rewrite on, so no visitor pass

inherits a switch from a print that ran before it.
