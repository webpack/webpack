closes a url() the tokenizer closed at EOF

Without the `)`, the `}` the printer writes next lands inside the url.

§4.3.6 reads the dangling `\` as an escape and §4.3.7 ends one at EOF with

U+FFFD, so the url keeps that code point rather than losing it.

An even run escapes itself and closes nothing.
