# defineConfig

`webpack.defineConfig` wraps a configuration so editors give you full type-checking
and autocompletion, with no effect at runtime. It accepts a configuration object, an
array of configurations (multi-compiler), a `(env, argv) => configuration` function,
or a `Promise` resolving to any of those.

# webpack.config.js

```javascript
"use strict";

const { defineConfig } = require("webpack");

// `defineConfig` is an identity function at runtime; it exists so editors type-check
// the configuration. It also accepts an array, a `(env, argv) => config` function,
// or a `Promise` of any of those.
module.exports = defineConfig({
	mode: "none"
});
```

# example.js

```javascript
const value = require("./value");

console.log(value);
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./value.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = "webpack.defineConfig keeps this configuration typed";


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
```

</details>

``` js
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__ */
const value = __webpack_require__(/*! ./value */ 1);

console.log(value);

})();

/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 1.8 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 127 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 72 bytes [dependent] 1 module
  ./example.js 55 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 245 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 127 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 72 bytes [dependent] 1 module
  ./example.js 55 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
