writes a unitless zero bare where the property's number may be zero

`width:0` is a length the declaration takes, where `calc(0)` is a

number it drops; `columns:0` gives the zero to `column-width`.

`font-weight:0` is out of `[1,1000]` and dropped where `calc(0)` is

clamped to 1; `column-count`'s range is the same, unstated in mdn-data.

---

keeps them on a unitless zero

`calc(0)` is a number, so `width:calc(0)` is dropped and renders at

`auto`; `width:0` is a length and renders at 0.

A zero carrying a unit is a length either way.
