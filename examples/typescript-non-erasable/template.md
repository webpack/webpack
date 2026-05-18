# When to use this example

Webpack 5 includes a built-in TypeScript transform via
`experiments.typescript: true` (see the `examples/typescript` example).
That transform uses Node.js's `module.stripTypeScriptTypes` and therefore
only handles the **erasable** TypeScript subset — types, `import type`,
`as`-casts, generics, etc. It rejects syntax that emits runtime code:
`enum`, `namespace`, parameter-property constructors, `export =`, decorator
metadata, JSX/`.tsx`.

If your project uses any of that non-erasable syntax, keep using a real
TypeScript transpiler. This example shows the classic setup with
`ts-loader` plus `fork-ts-checker-webpack-plugin` for type checking.

# example.js

```javascript
_{{example.js}}_
```

# index.ts

```typescript
_{{index.ts}}_
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
