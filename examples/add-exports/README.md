# Adding exports to a module

Some files export nothing: a legacy script that only defines globals, a vendored file, a bundle that was never written as a module. Appending the exports before webpack parses the file is enough — the parser reads them as the module's own.

No loader is needed for that. `NormalModule`'s `processResult` hook hands a plugin what the loaders produced — source, source map and any preparsed AST — and takes back a replacement. It is the same hook [adding imports](../add-imports) uses, from the other end of the file, and it is small enough to keep in the configuration.

Which format to append is the module's own, and the two are not equivalent. `export { … }` is what makes a file an ES module, exactly as it would be in the source, so those exports are analyzable: below, `math.js` has its `PI` inlined into the call site and its `add` hoisted into the entry, like any `export` webpack reads. `module.exports = …` keeps the file the script it is, and webpack treats it as it treats any module whose whole exports object is assigned a value — `legacy-global.js` below keeps runtime-defined exports and is not analyzed that way. Prefer the ES module form where the file tolerates it.

Appending moves nothing before it, so the source map is still valid; a preparsed AST is dropped, because webpack would otherwise parse that instead of the appended code.

# webpack.config.js

```javascript
"use strict";

const { NormalModule } = require("../../");

/** @import { Compiler } from "../../" */

const PLUGIN_NAME = "AddExportsPlugin";

/** @type {[RegExp, string][]} */
const addedExports = [
	// a script, so CommonJs exports
	[/legacy-global\.js$/, "module.exports = Legacy;"],
	// `export` makes the module an ES module, as it would in the source
	[/math\.js$/, "export { add, PI };"]
];

/**
 * Appends exports to modules which have none, before webpack parses them, so
 * the exports are read as the module's own.
 * @param {Compiler} compiler the compiler instance
 * @returns {void}
 */
const addExports = (compiler) => {
	compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
		NormalModule.getCompilationHooks(compilation).processResult.tap(
			PLUGIN_NAME,
			(result, module) => {
				const [source, sourceMap] = result;
				for (const [test, code] of addedExports) {
					// a global or sticky pattern keeps its lastIndex between calls,
					// which would skip the next module it is tested against
					test.lastIndex = 0;
					if (!module.resource || !test.test(module.resource)) continue;
					// appending moves nothing before it, so the source map still fits;
					// a preparsed ast would be parsed instead of the appended code
					return [`${source}\n${code}`, sourceMap, undefined];
				}
				return result;
			}
		);
	});
};

/** @type {import("../../").Configuration} */
module.exports = {
	plugins: [addExports]
};
```

# example.js

```javascript
import Legacy from "./legacy-global";
import { add, PI } from "./math";

console.log(new Legacy().version, add(PI, 1));
```

# legacy-global.js

```javascript
// A legacy script — it defines a constructor and exports nothing.
function Legacy() {
	this.version = "1.0.0";
}
```

# math.js

```javascript
// A vendored file — it defines values and exports nothing.
const PI = 3.14;

function add(first, second) {
	return first + second;
}
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!**************************!*\
  !*** ./legacy-global.js ***!
  \**************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 6:0-14 */
/***/ ((module) => {

// A legacy script — it defines a constructor and exports nothing.
function Legacy() {
	this.version = "1.0.0";
}

module.exports = Legacy;

/***/ }),
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! namespace exports */
/*! export PI [provided] [no usage info] [missing usage info prevents renaming] */
/*! export add [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PI: () => (/* binding */ PI),
/* harmony export */   add: () => (/* binding */ add)
/* harmony export */ });
// A vendored file — it defines values and exports nothing.
const PI = 3.14;

function add(first, second) {
	return first + second;
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
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = (module) => {
/******/ 		const getter = module && module.__esModule ?
/******/ 			() => (module['default']) :
/******/ 			() => (module);
/******/ 		__webpack_require__.d(getter, { a: getter });
/******/ 		return getter;
/******/ 	};
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	// define getter/value functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop));
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ 	
/************************************************************************/
```

</details>

``` js
let __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _legacy_global__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./legacy-global */ 1);
/* harmony import */ var _legacy_global__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_legacy_global__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./math */ 2);



console.log(new (_legacy_global__WEBPACK_IMPORTED_MODULE_0___default())().version, (0,_math__WEBPACK_IMPORTED_MODULE_1__.add)(_math__WEBPACK_IMPORTED_MODULE_1__.PI, 1));

})();

/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 4.85 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 417 bytes (javascript) 883 bytes (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 883 bytes 4 modules
  dependent modules 297 bytes [dependent] 2 modules
  ./example.js 120 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 514 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 417 bytes (javascript) 672 bytes (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 672 bytes 3 modules
  dependent modules 141 bytes [dependent] 1 module
  ./example.js + 1 modules 276 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
