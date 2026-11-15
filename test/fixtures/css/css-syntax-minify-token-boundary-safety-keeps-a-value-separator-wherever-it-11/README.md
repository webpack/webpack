keeps a value separator wherever it carries something

A number takes a `%` on, making `123 %` the one percentage `123%`.

An ident ending in a digit takes no `%`, so that one still tightens.

A bare number would take the `.` on, making `0 .5em` the one value `0.5em`.

Two idents would fuse into one.

CSS Values 4 §10.1 needs the whitespace around a math `-`.

A custom property and a substituted value are handed back as written.

In a selector the separator is a descendant combinator, not a separator.

A value the string transforms read stays space-separated for them.

---

a size whose second value is the one it defaults to

Each layer of the list drops its own.

Unlike a box longhand, the omitted second value is `auto` rather than

the first repeated, so two equal values are not one.

Each of these stands alone, so the second value makes a declaration

the engine drops — one a later declaration was written to beat.

With `--x:1px 2px` the `auto` makes a third value, and the declaration

the engine discards would become one it keeps.
