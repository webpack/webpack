reads past whitespace the collapse tier deletes

The `\n` after each `</p>` is content in the tree and nothing in the

output, so the tag it was keeping alive goes with it.

---

keeps the tag when that whitespace is printed

`"conservative"` prints one space, and off prints it verbatim; either

way something stands between the tag and the parent's end.
