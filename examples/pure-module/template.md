This example features the `pure-module` flag.

The example contains a assumingly big library named `big-module`. This library is split into multiple child modules `a`, `b` and `c`. The exports from these modules are reexported in the entry (`index.js`) of the library. A consumer uses **some** of the exports by importing them from the library via `import { a, b } from "big-module"`. In this case according to the EcmaScript spec all child modules must be evaluated because they could contain side effects.

When using the `"pure-module": true` flag in `package.json` the package author promises that modules contain no side effects expect exposed exports. This allows to optimize reexports. In this case `import { a, b } from "big-module-pure"` is treated like `import { a } from "big-module-pure/a"; import { b } from "big-module-pure/b"`. This is done by following reexports.

The example shows `big-module` (without pure-module flag) and `big-module-pure` (with pure-module flag). From both packages the exports `a` and `b` are used.

From `big-module` these files are included: `index.js` `a.js` `b.js` `c.js`.

From `big-module-pure` these files are included: `a.js` `b.js`

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
