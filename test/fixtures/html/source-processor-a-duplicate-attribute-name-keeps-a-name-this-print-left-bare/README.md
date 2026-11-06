keeps a name this print left bare off the template's next byte

A quoted value ends at its quote, so the source needed nothing between

it and `{%`. Collapsing it to a bare name leaves the two to fuse.

A `/` terminates a bare name by itself, so it still needs no space.

---

minifies the attributes the block is written around

What rebuilding the tag buys over echoing it: an attribute inside the

block is minified like any other, the boolean and the list alike.
