finds the end of a forgiving list an escape sits in

The escaped `)` closes nothing, so the list runs on to the real one

and `::-ms-expand` is still read after it.

The lone compound comes out of its `:is()`, escape and all.

A value holding both quotes keeps its escape, and the escaped one

leaves the string open so the `)` in it does not end the list.
