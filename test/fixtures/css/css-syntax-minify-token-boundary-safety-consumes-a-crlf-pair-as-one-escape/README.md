The tokenizer takes CRLF as a single terminator, so dropping only the CR

would leave a raw newline inside the identifier — `.A\nbc`, which is two

selectors, not the class `Abc`.
