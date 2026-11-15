keeps a box repeating a CSS-wide keyword

Each is only valid as the whole value, so the repeated form is already

discarded — collapsing it would switch the declaration on.

The names match case-insensitively, and the `/` box is no way around it.

One keyword alone is the valid form, so it is left as it is.

`auto` and `currentcolor` are per-side values, not CSS-wide keywords.
