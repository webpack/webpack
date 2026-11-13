---
"webpack": patch
---

Keep a minified HTML page's meaning in more places: the end tag of a cell or caption last in a `<template>`, a `<noscript>` read with scripting off, a doctype whose mode depends on the reader, a `data:` URL with a spaced `; base64` flag, and a document in another encoding than UTF-8, which is now left as written with a warning.
