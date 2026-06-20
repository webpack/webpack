# Using WebAssembly compiled by Emscripten (or any external runtime)

Tools like **Emscripten** (and other C/C++/Rust toolchains) emit a `.wasm`
binary plus a JavaScript "glue" module that **instantiates the wasm itself** —
it builds the import object, provides memory, runs constructors and reads back
the exports. Because only the glue can build that import object, webpack must
**not** instantiate the module; routing the `.wasm` through the normal
`webassembly/async` _instantiation_ path fails with
`export 'default' ... was not found` (webpack instantiates and exposes the raw
wasm exports, which is not what the glue expects).

The fix is a **WebAssembly source-phase import** (`import source`). webpack still
treats the `.wasm` as a first-class async WebAssembly module — it is fetched,
compiled, content-hashed and code-split — but it stops at _compile_ and hands
the consumer the `WebAssembly.Module`. The glue then instantiates it through
Emscripten's official `instantiateWasm` hook.

No `asset/resource`, no `locateFile`, no `resolve.fallback: { fs: false }`, no
`copy-webpack-plugin`.

> The `emscripten-module.js` here is a tiny stand-in that mirrors the contract
> of real Emscripten `-sMODULARIZE -sEXPORT_ES6` output (a default-exported
> factory honoring `Module.instantiateWasm`). Swap in your real glue unchanged.

# example.js

```javascript
_{{example.js}}_
```

# emscripten-module.js

```javascript
_{{emscripten-module.js}}_
```

# webpack.config.js

```javascript
_{{webpack.config.js}}_
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
