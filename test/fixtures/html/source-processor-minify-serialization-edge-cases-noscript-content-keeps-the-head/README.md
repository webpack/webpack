keeps the head whitespace a reader with scripting off reads as body text

That reader leaves the head at the `<img>`, so what follows is in the body.

`<!-->` closes at once, so `PASS` is text to that reader, not a comment.

The mode passes a `<style>` through, but only void elements are read as safe.
