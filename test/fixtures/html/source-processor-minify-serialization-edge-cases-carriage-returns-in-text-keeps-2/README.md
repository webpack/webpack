carriage returns in text

Preprocessing maps CR to LF without changing length, so the raw

source is not the text's serialization even at equal lengths.

`leadingWs` splits this run, and its source span has to survive the

CRLF collapsing or the tail is dropped. `<colgroup>` both splits the

run and keeps it, where `<head>` / `<html>` drop theirs as inert.

Decoding shortens the run, so the split cannot count its offsets in

the source either.
