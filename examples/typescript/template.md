# Built-in TypeScript support

Webpack 5 ships an experimental TypeScript transform behind
`experiments.typescript: true`. It wires up Node.js's
`module.stripTypeScriptTypes` (Node.js >= 22.7) to strip type annotations
from `.ts`, `.cts`, `.mts` files at build time, registers the matching
module rules, adds `.ts` to `resolve.extensions`, sets `extensionAlias`
so `.js`/`.cjs`/`.mjs` imports also resolve `.ts`/`.cts`/`.mts` siblings,
and turns on tsconfig.json resolution.

Only the **erasable** TypeScript subset is supported here. For
non-erasable syntax (enums, namespaces, parameter-property constructors,
JSX/`.tsx`), use `ts-loader` or `swc-loader` — see the
`typescript-non-erasable` example.

# example.js

```javascript
_{{example.js}}_
```

# index.ts

```typescript
_{{index.ts}}_
```

# greeter.ts

```typescript
_{{greeter.ts}}_
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
