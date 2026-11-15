writes a reference the parser cannot read back as one

`<` and `>` mean nothing inside a quoted value, and an `&` no reference

can start after it is data — but one that could start a reference stays.

A bare value ends at `>`, so the value is quoted rather than the

reference kept — one character shorter, and the same value.
