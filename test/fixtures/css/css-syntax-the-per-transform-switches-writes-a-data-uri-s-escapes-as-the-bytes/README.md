writes a data URI's escapes as the bytes they name: %s

A `url()` holds two rewrites, and each answers to its own switch: writing

a data URI's percent-escapes as the bytes they name, and taking the quotes

off a body that is a url-token without them.

---

writes the payload out with no renderer

With no renderer the payload is still written as the bytes its escapes

name, which is what makes it the same URL either way.

The embedded-source renderer reads a data URL's payload, which is what the percent-escapes hold, so it is offered the decoded one, and what it hands back is quoted or not as `normalizeQuotes` says.
