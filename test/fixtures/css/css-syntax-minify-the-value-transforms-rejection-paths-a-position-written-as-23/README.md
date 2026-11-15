a position written as edge keywords

`<position>`'s keyword pair is order-free, so both readings resolve.

A centered edge is the one keyword naming it, shorter than both halves.

`transform-origin` spells its axes out rather than naming a position,

and a depth only follows a third component.

`top` is `50% 0%`, which the keyword already says in fewer bytes.

An offset beside a keyword is the 3/4-value syntax, where the keyword

names the edge to measure from rather than a place on the axis.

A percentage is read by where it stands, so neither is a position.

A third component is `transform-origin`'s z offset, which the two-value

collapse has no reading of.

A shorthand's own position slot is read where the layer is, which is

what takes `left top` out as the place an unwritten one names.

---

a position whose second value is the centre

The tail gone, the edge keyword left behind goes on to the percentage

it resolves to — as `left` and `left center` already do.

`top` is no x-position, so the pair is the order-free keyword syntax

and half of it alone would be a value the engine drops.
