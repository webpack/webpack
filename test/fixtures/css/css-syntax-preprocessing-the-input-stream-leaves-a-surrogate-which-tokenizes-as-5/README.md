§3.3 names surrogates too, and webpack skips them because a lone one is an ident code point here; the tokens are those of U+FFFD in its place.

Each token carries the same run as with U+FFFD in its place, so the boundaries agree too, modulo the one code point, which is what is not being replaced.
