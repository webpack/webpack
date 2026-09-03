# Adding imports to a module

Some files read what they never import: a script written for a `<script>` tag that expects `$` on a global, a polyfill it needs but never names, a top-level `this` that was the window. Putting the imports around the file before webpack parses it is enough — the parser reads them as the module's own, so they are ordinary dependencies with ordinary tree shaking, mangling and scope hoisting.

No loader is needed for that. `NormalModule`'s `processResult` hook hands a plugin what the loaders produced — source, source map and any preparsed AST — and takes back a replacement. It is the same hook [adding exports](../add-exports) uses, from the other end of the file, and it is small enough to keep in the configuration.

Reach for it only for what it is for. A name the module merely **reads** is `ProvidePlugin`'s job: it binds the name where the module reads it, hoisted above the body, without touching the source. What is left for this plugin is a side-effect import the file never names, a real binding, and the wrapper below.

Two details the plugin has to respect, and one to know:

- A `"use strict"` directive stays the first statement, or prepending demotes it to an expression and the module silently turns sloppy.
- `before` ends without a newline, so nothing below it shifts and the source map still fits; `after` adds one line at the end, which shifts nothing above it.
- The wrapper is for scripts only. `import`/`export` may only appear at the top level, so wrapping an ES module in a function is a syntax error — an ES module already answers `undefined` for a top-level `this` anyway.

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# example.js

```javascript
_{{example.js}}_
```

# legacy-lib.js

```javascript
_{{legacy-lib.js}}_
```

# jquery.js

```javascript
_{{jquery.js}}_
```

# polyfill.js

```javascript
_{{polyfill.js}}_
```

# dist/output.js

```javascript
_{{dist/output.js}}_
```

# Info

## Unoptimized

```
_{{stdout}}_
```

## Production mode

```
_{{production:stdout}}_
```
