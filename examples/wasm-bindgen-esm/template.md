This is a simple example that shows the usage of an ES module packaging around a Rust module, built by wasm-pack.

The ES module can be imported like other async modules with `import` or `import()`.
When importing, the underlying WebAssembly module is downloaded and instantiated in a streaming way.

# example.js

```javascript
_{{example.js}}_
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
