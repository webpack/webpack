keeps both where %s

A layer with no name is a layer of its own.

`@layer a.b` writes where `@layer a{@layer b{…}}` writes, so the one

between them is that same layer under its other spelling.

Reached the other way round, the block between them is that same layer,

and the order within a layer is one the cascade reads.

A kept comment was written above what follows it, so nothing moves back

over one.

`@layer a.b` is not `@layer a`.
