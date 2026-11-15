reads the rest of a selector past a forgiving list

The list is stepped over as one, and what follows or precedes it is

still read — `.a:is(.b)::-ms-expand` parses nowhere.

The string holds a `)`, so only the one closing the list ends it.

Both names are matched the way an engine reads them, case and all.
