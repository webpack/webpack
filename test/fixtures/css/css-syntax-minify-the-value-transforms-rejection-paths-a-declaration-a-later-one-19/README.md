keeps it behind %s

The later value is the one an engine may not read, which is what a

fallback pair is written for.

A keyword an engine may not know is not one either — and `display`

is where that pair is written on purpose.

An `!important` earlier declaration still wins.

CSS Animations 1 §3 ignores an `!important` declaration in a

keyframe, so the plain one before it is what the engine reads.
