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

a shorthand slot holding its own initial

A comma parts two layers, and each holds its own set of slots.

Only the layer whose slots are unambiguous gives its keyword up.

`all` is the property a layer naming none transitions, so it is spare

beside anything else — but it is what a layer left alone still says.

The zero duration goes first, which leaves `all` standing alone.

A family reads each slot by what it takes, so a width and a color are

answered for as well as a keyword: both of these hold their initial.

Both slots hold their initial, so the shortest one says both — whichever

order they were written in.

A slot of keywords and calls — `<bg-image>` is `none` or an image

function — is checked for a sibling like a keywords-only one.

`background-origin` and `background-clip` are two slots of one production, so

neither initial is that slot's own in the keyword table — the layer reads them

as the pair they are, which is what each holds when nothing writes it.

A slot taking a length or a color is read the same way, by the classes

a sibling's own value is in: neither `solid` nor `red` is a width.

...and a sibling that is one keeps it.

`none` is both an animation name and a fill mode, so which slot it

fills is not a question the grammar answers.

`mask: url(…) none` fills `<mask-reference>` twice and is a declaration

the engine drops — removing the `none` would revive it.

A function fills the easing slot as much as a keyword does.

Each layer keeps its own siblings, so the ambiguous one stays whole.

A string could carry the comma the layer split reads.

An image function fills `<bg-image>` as much as `none` does.

A `/` reaches a slot through another's value, so the components are no

longer this one flat list.

A `||` slot's components stand together, so the keyword parting two of

one slot leaves a value the engine drops — and dropping it revives it.
