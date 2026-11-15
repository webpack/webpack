keeps a `</p>` a quirks-mode `<table>` would not close

A `<table>` start tag closes an open `p` only outside quirks mode, so

there the two would nest instead of staying siblings.
