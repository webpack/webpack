# Exposing a module to the global object

Some scripts are not part of the bundle: an inline `<script>`, a plugin written for a `<script>` tag, a snippet a CMS pastes in. They read what they need off the global object, and putting it there is one appended line — the parser reads the assignment as the module's own code.

No loader is needed for that. `NormalModule`'s `processResult` hook hands a plugin what the loaders produced — source, source map and any preparsed AST — and takes back a replacement. It is the same hook [adding exports](../add-exports) and [adding imports](../add-imports) use, and it is small enough to keep in the configuration.

What the line assigns is whatever the module has in scope, so an ES module names the binding it exports, and webpack analyzes that reference like any other: below, `math.js` keeps `add` — renamed with the rest of the module, and hoisted into the entry — while `PI`, which nothing reads, is still shaken out. A script that assigns its whole exports object is exposed by appending `globalThis.$ = module.exports;` instead. A name read out of an exports object at runtime, which a module wrapping another one has to do, is neither analyzed nor renamed.

The assignment runs when the module is evaluated, so something still has to import it — a module nothing pulls in is not in the bundle at all. Where the file sits in a package marked `"sideEffects": false` and the importer uses none of its exports, webpack drops that import before it can assign; `{ test: /…/, sideEffects: true }` in `module.rules` says otherwise for that file. And the global object is whatever the appended line names, so a target that predates `globalThis` gets `self` or `window`.

# webpack.config.js

```javascript
"use strict";

const { NormalModule } = require("../../");

/** @import { Compiler } from "../../" */

const PLUGIN_NAME = "ExposeGlobalPlugin";

/** @type {[RegExp, string][]} */
const exposes = [
	// the default export is a binding in scope, under both names a script reads
	[/jquery\.js$/, "globalThis.$ = globalThis.jQuery = jQuery;"],
	// one export of many, the rest of the module still shaken out
	[/math\.js$/, "globalThis.add = add;"]
];

/**
 * Appends the assignment that puts a module in the global object, before
 * webpack parses it, so the reference is read as the module's own.
 * @param {Compiler} compiler the compiler instance
 * @returns {void}
 */
const exposeGlobal = (compiler) => {
	compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
		NormalModule.getCompilationHooks(compilation).processResult.tap(
			PLUGIN_NAME,
			(result, module) => {
				const [source, sourceMap] = result;
				for (const [test, code] of exposes) {
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
	plugins: [exposeGlobal]
};
```

# example.js

```javascript
import jQuery from "./jquery";
import { add } from "./math";

// A script outside the bundle reads the same values off the global object.
console.log(jQuery(".app"), globalThis.$(".app"));
console.log(add(1, 2), globalThis.add(1, 2));
```

# jquery.js

```javascript
// A library a script outside the bundle expects to find on a global.
export default function jQuery(selector) {
	return `element(${selector})`;
}
```

# math.js

```javascript
export function add(first, second) {
	return first + second;
}

export const PI = 3.14;
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!*******************!*\
  !*** ./jquery.js ***!
  \*******************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ jQuery)
/* harmony export */ });
// A library a script outside the bundle expects to find on a global.
function jQuery(selector) {
	return `element(${selector})`;
}

globalThis.$ = globalThis.jQuery = jQuery;

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

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PI: () => (/* binding */ PI),
/* harmony export */   add: () => (/* binding */ add)
/* harmony export */ });
function add(first, second) {
	return first + second;
}

const PI = 3.14;

globalThis.add = add;

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
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _jquery__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./jquery */ 1);
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./math */ 2);



// A script outside the bundle reads the same values off the global object.
console.log((0,_jquery__WEBPACK_IMPORTED_MODULE_0__["default"])(".app"), globalThis.$(".app"));
console.log((0,_math__WEBPACK_IMPORTED_MODULE_1__.add)(1, 2), globalThis.add(1, 2));

})();

/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 4.71 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 535 bytes (javascript) 614 bytes (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 614 bytes 3 modules
  dependent modules 300 bytes [dependent] 2 modules
  ./example.js 235 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 220 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 535 bytes [entry] [rendered]
  > ./example.js main
  ./example.js + 2 modules 535 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
