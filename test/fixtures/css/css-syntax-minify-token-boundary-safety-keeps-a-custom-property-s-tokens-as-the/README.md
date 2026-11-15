keeps a custom property's tokens as the source wrote them

No token is rewritten; a dropped comment leaves the boundary it stood

for, a space only where the tokens it parts would fuse.

Leading and trailing whitespace is not part of it.

A `/*` inside a string is no comment.

A kept comment stays where it stood, so it is not also re-emitted before

the next top-level node — and it parts the tokens itself.

One rule's custom properties take their own, in the order they stand in.

Outside one it still moves ahead of the rule that follows it.

---

The boundaries the option does not touch still print as they did.
