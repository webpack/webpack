This example shows how the `pure-module` flag for library authors works.

The example contains a large library, `big-module`. `big-module` contains multiple child modules: `a`, `b` and `c`. The exports from the child modules are re-exported in the entry module (`index.js`) of the library. A consumer uses **some** of the exports, importing them from the library via `import { a, b } from "big-module"`. According to the EcmaScript spec, all child modules _must_ be evaluated because they could contain side effects.

The `"pure-module": true` flag in `big-module`'s `package.json` indicates that the package's modules have no side effects (on evaluation) and only expose exports. This allows tools like webpack to optimize re-exports. In the case `import { a, b } from "big-module-pure"` is rewritten to `import { a } from "big-module-pure/a"; import { b } from "big-module-pure/b"`.

The example contains two variants of `big-module`. `big-module` has no pure-module flag and `big-module-pure` has the pure-module flag. The example client imports `a` and `b` from each of the variants.

After being built by webpack, the output bundle contains `index.js` `a.js` `b.js` `c.js` from `big-module`, but only `a.js` and `b.js` from `big-module-pure`.

Advantages:

* Smaller bundles
* Faster bootup

# example.js

``` javascript
{{example.js}}
```

# node_modules/big-module/package.json

``` javascript
{{node_modules/big-module/package.json}}
```

# node_modules/big-module-pure/package.json

``` javascript
{{node_modules/big-module-pure/package.json}}
```

# node_modules/big-module(-pure)/index.js

``` javascript
{{node_modules/big-module-pure/index.js}}
```

# js/output.js

``` javascript
{{js/output.js}}
```

# Info

## Uncompressed

```
{{stdout}}
```

## Minimized (uglify-js, no zip)

```
{{min:stdout}}
```
