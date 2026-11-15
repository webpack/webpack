re-adds the leading newline <${name}> would lose on re-parsing

The parser eats one newline going in, so a value that starts with one

needs a second — knowable only once the children are in, which is why

this element prints whole.
