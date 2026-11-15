minifies the whitespace between a custom property's tokens

Whitespace between two tokens says only that they are two, so a run of it

is the one space they need and a substitution reads the same stream.

Nothing fuses with a comma, so the boundaries either side of one go.

Nor with a block's delimiters, on either side of one.

`(` is the exception: an ident in front of it makes a function token.

Nor with a block's delimiters, at any depth and in a block of every shape.

A string or a url is one token, written back whole.

`calc()`'s `+` is an operator only with whitespace either side, and a

collapsed run is still whitespace.

A kept comment takes the boundary it stood in with it.

The last boundary parts the value from a `)` it cannot fuse with, so only

a kept comment in it is left to print.
