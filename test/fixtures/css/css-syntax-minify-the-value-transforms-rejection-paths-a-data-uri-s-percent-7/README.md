a data URI's percent-escapes

Decoding leaves a body the url-token spelling can carry.

A url written as a url-token decodes too, keeping only the bytes the

token cannot carry — there are no quotes here to hold them.

Each escape names one byte: `%C3%A9` is the two of `é`, and writing

them apart would re-encode as four.

An escape the url-token already carries is one this printer did not

write, so its `\%` is not read as the start of a percent-escape.

Outside a data URI's payload an escape is structure, not content:

`%26` in a query is a literal `&`, not a separator.

`#` would start the fragment and `%` the next escape.
