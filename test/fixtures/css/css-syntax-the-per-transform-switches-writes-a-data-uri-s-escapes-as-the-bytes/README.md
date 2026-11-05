writes a data URI's escapes as the bytes they name: %s

A `url()` holds two rewrites, and each answers to its own switch: writing

a data URI's percent-escapes as the bytes they name, and taking the quotes

off a body that is a url-token without them.

---

writes the payload out with no renderer

With no renderer the payload is still written as the bytes its escapes

name, which is what makes it the same URL either way.
