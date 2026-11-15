drops a ruby segment's end tag only inside a `ruby`

Without one the follower's start tag closes nothing, so this one would

go on to hold it.

A scope marker between the two ends the search, whether it is an element

`ruby` cannot reach past or a content fragment above it.

So does leaving HTML: the `ruby` above is in another namespace's subtree.
