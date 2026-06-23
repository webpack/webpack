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
console.log(require("./index"));
```

# index.ts

```typescript
import { greet, type User } from "./greeter.ts";

const alice: User = { name: "Alice", age: 31 };
const bob: User = { name: "Bob", age: 27 };

console.log(greet(alice));
console.log(greet(bob));
```

# greeter.ts

```typescript
export interface User {
	name: string;
	age: number;
}

export function greet(user: User): string {
	return `Hello, ${user.name} (${user.age})`;
}
```

# webpack.config.js

```javascript
"use strict";

const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

// `experiments.typescript: true` enables webpack's built-in TypeScript
// support. Internally it wires up `module.stripTypeScriptTypes` (Node.js
// >= 22.7) to strip type annotations from `.ts`, `.cts`, `.mts` files at
// build time. It also registers the matching module rules, adds `.ts` to
// `resolve.extensions`, sets up `extensionAlias` so `.js`/`.cjs`/`.mjs`
// imports also try their `.ts`/`.cts`/`.mts` siblings, and enables
// tsconfig.json resolution.
//
// `stripTypeScriptTypes` is purely a transpile step — it strips type
// annotations and does NOT type-check. We pair it with
// `fork-ts-checker-webpack-plugin`, which runs `tsc --noEmit` in a worker
// so build errors and type errors both surface at compile time, the same
// trade-off as `ts-loader { transpileOnly: true }` + `ForkTsChecker`.
//
// Limitations: only the **erasable** TypeScript subset is supported —
// `enum`, `namespace`, parameter-property constructors, decorator
// metadata, and JSX/`.tsx` are NOT handled here. For those, use
// `ts-loader` or `swc-loader` (see the `typescript-non-erasable`
// example).

/** @type {(env: "development" | "production") => import("webpack").Configuration} */
const config = (env = "development") => ({
	mode: env,
	experiments: {
		typescript: true
	},
	plugins: [new ForkTsCheckerWebpackPlugin({ async: env === "production" })]
});

module.exports = config;
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./index.ts ***!
  \******************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _greeter_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./greeter.ts */ 2);


const alice       = { name: "Alice", age: 31 };
const bob       = { name: "Bob", age: 27 };

console.log((0,_greeter_ts__WEBPACK_IMPORTED_MODULE_0__.greet)(alice));
console.log((0,_greeter_ts__WEBPACK_IMPORTED_MODULE_0__.greet)(bob));


/***/ }),
/* 2 */
/*!********************!*\
  !*** ./greeter.ts ***!
  \********************/
/*! namespace exports */
/*! export greet [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   greet: () => (/* binding */ greet)
/* harmony export */ });
                       
	             
	            
 

function greet(user      )         {
	return `Hello, ${user.name} (${user.age})`;
}


/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter/value functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			if(Array.isArray(definition)) {
/******/ 				var i = 0;
/******/ 				while(i < definition.length) {
/******/ 					var key = definition[i++];
/******/ 					var binding = definition[i++];
/******/ 					if(!__webpack_require__.o(exports, key)) {
/******/ 						if(binding === 0) {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, value: definition[i++] });
/******/ 						} else {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, get: binding });
/******/ 						}
/******/ 					} else if(binding === 0) { i++; }
/******/ 				}
/******/ 			} else {
/******/ 				for(var key in definition) {
/******/ 					if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
let __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__ */
console.log(__webpack_require__(/*! ./index */ 1));

})();

/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 4.8 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 375 bytes (javascript) 1.07 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 1.07 KiB 3 modules
  dependent modules 342 bytes [dependent] 2 modules
  ./example.js 33 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 313 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 375 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 342 bytes [dependent] 1 module
  ./example.js 33 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
