keeps a value separator wherever it carries something

A number takes a `%` on, making `123 %` the one percentage `123%`.

An ident ending in a digit takes no `%`, so that one still tightens.

A bare number would take the `.` on, making `0 .5em` the one value `0.5em`.

Two idents would fuse into one.

CSS Values 4 §10.1 needs the whitespace around a math `-`.

A custom property and a substituted value are handed back as written.

In a selector the separator is a descendant combinator, not a separator.

A value the string transforms read stays space-separated for them.
