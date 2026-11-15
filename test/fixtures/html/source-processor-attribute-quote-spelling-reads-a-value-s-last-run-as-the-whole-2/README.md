reads a value's last run as the whole of it, unlike a text node's

Text keeps the escape because the next sibling could complete the run

once a comment between them goes (`&am` + `p;`); an attribute value

ends at its delimiter, so nothing can follow it there.
