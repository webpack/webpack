The quote is written back before the transforms read the string, so `bar`

is the value either way and the same unquoting a closed string gets

applies. An at-rule prelude still prints at EOF, unlike a qualified rule

(§5.4.3), so the `];` follows.
