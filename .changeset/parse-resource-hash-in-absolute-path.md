---
"webpack": patch
---

Escape `#` characters that appear inside a path-shaped request's directory portion before passing the request to the resolver, so projects located in directories like `/home/user/proj#1` (and tools like webpack-dev-server that build entry requests with query strings) resolve correctly. The escape only kicks in when the request contains both a `#` in the path portion and a `?` query string — paths without a query keep their existing semantics.
