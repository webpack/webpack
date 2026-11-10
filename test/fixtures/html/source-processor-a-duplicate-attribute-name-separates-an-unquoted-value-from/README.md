separates an unquoted value from what the source wrote next

Dropping the quotes leaves nothing between the value and the template, and

an unquoted value reads on to the next ASCII whitespace or `>`.

A `/` the tokenizer read as a separator is one of those bytes too.
