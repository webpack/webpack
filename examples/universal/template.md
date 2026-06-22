This example shows the **`universal` target** — `target: "universal"` — which makes a single webpack compiler emit **one ESM bundle that runs in the browser, web workers, Node.js, Electron and NW.js**.

The `universal` preset is the intersection of every platform webpack knows about: it only uses runtime features (chunk loading, global object, etc.) that all of them support, and output is **always ECMAScript modules**. The bundle bakes in no platform-specific assumptions, so anything platform-dependent is resolved at **runtime** instead. Because output is always ESM, `experiments.outputModule` and `output.module` default to `true` for this target — no extra config needed.

This example demonstrates the full potential of that setup:

- **One source, every runtime** — `example.js` is built once and runs unchanged on each platform.
- **Runtime environment detection** — `env.js` reports the current platform without any build-time `target` branch.
- **Universal code splitting** — the dynamic `import("./render")` is emitted as a separate `.mjs` chunk, and webpack generates a chunk loader that works everywhere (native `import()` in the browser, dynamic `import()` of the emitted module in Node).
- **Universal output sink** — the lazily-loaded `render.js` writes to the DOM in a browser and to stdout in Node.

# example.js

```javascript
_{{example.js}}_
```

# env.js

```javascript
_{{env.js}}_
```

# render.js

```javascript
_{{render.js}}_
```

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# dist/output.mjs

```javascript
_{{dist/output.mjs}}_
```

# dist/render_js.mjs

```javascript
_{{dist/render_js.mjs}}_
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
