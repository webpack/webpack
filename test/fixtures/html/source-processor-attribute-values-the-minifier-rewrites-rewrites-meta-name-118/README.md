rewrites %s

Only the bytes between candidates go: the list itself is the same.

A descriptor-less URL keeps the space that ends it before the next.

What the parser rejects is left as written: no valid descriptor holds a

`(`, and a list of no candidate is no list.

A comma list loses the whitespace around each comma only.

The viewport list's grammar skips the whitespace around its separators,

whichever reference spells the name.

An integer is written the one way its rules read it, and a value they do

not read as one is left alone.

Two tokens are one only when every character matches, whatever packed key

the comparison starts from.
