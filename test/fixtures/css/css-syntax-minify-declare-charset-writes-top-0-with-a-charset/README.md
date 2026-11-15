writes %s with a `@charset`

Wherever the output holds a non-ASCII character, as cssnano keeps one, so

it is read as UTF-8 even where served from a page in another encoding.

The BOM is not carried behind the `@charset`, where it reads as a selector.
