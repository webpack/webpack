clips a color sRGB cannot show, which the declaration after it corrects

Replacing the function with this would be a different color; standing

before it, it is only ever read where there is no better answer.

---

falls back through the widest gamut the target reads

Safari 15 reads `color()` and no Lab family, so the color goes out three

times: the clipped hex, the gamut P3 does show, and the author's own.

A target reading no `color()` has only the hex to fall back to.

...and a color P3 cannot show either takes no rung of its own.

A component the wider gamut fills outright prints as the whole number.

The rung carries the alpha, and every color of the declaration.

An alpha the engine stores as `255` is the opaque color, so the rung

carries no alpha rather than an empty one.

A gradient holding one color the target reads and one it does not takes

the rung over the second alone.
