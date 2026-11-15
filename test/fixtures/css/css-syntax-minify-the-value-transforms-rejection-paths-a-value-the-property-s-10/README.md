a value the property's own grammar already implies

One `<repeat-style>` value is what two equal ones say.

One value of a pair shorthand sets both its sides.

`initial` computes to the initial value, which is often a shorter word.

...but not where that word is itself a length: `zoom` scales the keyword and

not the `initial` resolved before it, so the two are one value without a zoom

and two under one — measured in Chromium, 3px against 1.5px at `zoom:2`.

The source carries its own comments, so the queued copy is claimed

rather than flushed again after the rule.

Only decoding tells this at-keyword from `@namespace`, so the empty

rule the prologue needs is kept either way.

The production also sits in shorthands, where a repeated value is some

other slot — and `background: red red` is a declaration the engine

drops, not one to make valid.

Alone, `baseline` sets `justify-content` to `start`, which it cannot be.

Two are invalid, and a substitution may be two values itself.

`repeat-x` is the one-value spelling of a pair, so it never doubles.

`mdn-data` states `black` as this one's initial, which it cannot take.
