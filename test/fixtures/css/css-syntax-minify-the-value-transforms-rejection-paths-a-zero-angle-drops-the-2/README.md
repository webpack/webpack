a zero angle

`hue-rotate` goes further still — see the omitted-argument tests.

`rotate3d`'s first three arguments are numbers, so a `0deg` there is a

declaration the engine drops — a unitless zero would revive it.

A scaled axis names the same one but is not folded, so the angle still

sits last here.
