a comma list a later declaration writes again

The item slot takes a `<custom-ident>`, so an engine knowing neither

spelling still parses the value and has nothing to fall back to.

...whichever spelling the earlier one wrote

...and for a keyframes name, which is a `<custom-ident>` too

A comma inside a call parts that call's arguments, not the list's items.

...nor does one inside a string, escapes and all — the quote the printer

swapped to drop the escape is on both sides, so they still match.

`-webkit-ease` is no `<easing-function>`, so that declaration is one an

engine drops — which is what the earlier one is there for.

A `<custom-ident>` reached inside a function's arguments is that

function's, and a function is a thing an engine may not know.

Nothing says the added item parses wherever the kept ones do.

The earlier one is not written again at all.

An `!important` earlier one wins whatever the later writes.

The later one writes fewer items than the earlier, so it cannot be

writing all of them again.
