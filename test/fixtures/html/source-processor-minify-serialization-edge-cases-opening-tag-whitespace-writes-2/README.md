writes back a `/` the tokenizer read as the separator

A template engine reads `{{/if}}` as one word, and the space this print

used to put there instead split it. Both separate, at the same byte.

A run holding whitespace still collapses to the one space it needs.

After an unquoted value the `/` would read as its last character, so

the space stands instead.
