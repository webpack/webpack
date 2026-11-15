shortens a number only where it lands on every layout step the written one does

An engine scales a number by a font size, a line height or a box and

floors it to 1/64px: 2/19em is 2px at 19px, where `.105263em` is 1.98438px,

and `line-height:1.42857` lays a 14px line at 19.98438px, not 20px.

`.125em` would land on a step at 8px where the written length does not.

13/252em at 63px: `.0515873em` is 3.25px only until parsed to a float.

The same holds for every unit and a bare number, in any declaration.

...and a fold no shorter number lands like keeps its `calc()`.

...and lands on a spelling no second pass shortens further.
