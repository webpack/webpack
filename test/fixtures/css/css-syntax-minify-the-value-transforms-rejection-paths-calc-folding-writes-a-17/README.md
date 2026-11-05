writes a unitless zero bare where the property's number may be zero

`width:0` is a length the declaration takes, where `calc(0)` is a

number it drops; `columns:0` gives the zero to `column-width`.

`font-weight:0` is out of `[1,1000]` and dropped where `calc(0)` is

clamped to 1; `column-count`'s range is the same, unstated in mdn-data.
