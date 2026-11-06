keeps them on a unitless zero

`calc(0)` is a number, so `width:calc(0)` is dropped and renders at

`auto`; `width:0` is a length and renders at 0.

A zero carrying a unit is a length either way.
