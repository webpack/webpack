a transform naming the same matrix

CSS Transforms 2 §13.1: a rotation about one axis is the call naming it.

A z factor of 1 scales nothing along it, leaving the 2D scale.

One reduction uncovers the next: the 2D call it leaves reduces too.

CSS Transforms 2 §12: a 3D matrix whose third row and column are the

identity's is the 2D matrix of the six values it leaves.

A 2D pair of 1 scales nothing there, leaving the z scale.

`skewX(a)` is `skew(a)`: the second component defaults to 0.

A factor of 1 scales nothing along its axis.

A translation is a `<length-percentage>`, so a zero of either kind is

the same no-op — a percentage resolves against the element's own size.

A substitution could expand to something the shorter call rejects —

`translate(var(--x),0)` with `--x:1px,2px` is dropped where

`translate(var(--x))` applies, so reducing it revives a declaration.

The engine normalizes the axis it is given: a scaled component still

names the axis, but a negative one turns the rotation the other way.
