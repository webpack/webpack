CssSyntax minify — vendor prefixes (target selection)

`text-size-adjust` is prefixed on IE Mobile and absent from desktop IE,

which BCD cannot say because it does not track IE Mobile at all.

caniuse dates unprefixed `font-kerning` a release after BCD on desktop and

three years after it on iOS; the feature is this one property, so the gap

is a disagreement rather than a wider feature.

IE Mobile 10 is Trident 6, so it needs the 2012 flexbox renames exactly as

IE 10 does; 11 is Trident 7 and needs none of them.

BCD dates Opera's unprefixed `border-image` at 11; caniuse, which is the

only dataset following Presto version by version, marks every version

that has it at all as needing the prefix.

Opera Mobile kept `text-overflow` prefixed four versions past desktop.

Presto shipped `object-fit` as its own extension a year before BCD dates

the prefixed form, and `background-size` went plain at 10.5, not at 10.

Gecko carries `-moz-text-size-adjust` as a real longhand with no unprefixed

spelling, so a Firefox target losing the `-moz-` one is left with a declaration

it cannot parse. BCD calls desktop Firefox unsupported, which is about effect.

Before Gecko carried it, there is nothing to write.

BCD records `-webkit-` for the feature; caniuse marks the version prefixed

and resolves the name from a browser-wide `-ms-` default, which is what

autoprefixer and lightningcss write. Neither says why, so both go out.

Chromium-era Edge reads the unprefixed one, so neither is written.

And a source carrying the `-ms-` one loses it once no target needs it.

Chrome 130 is past `user-select`'s unprefixed arrival and 40 is inside its

prefix window: an interval is not answered by the selection's low end.
