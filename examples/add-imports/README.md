# Adding imports to a module

Some files read what they never import: a script written for a `<script>` tag that expects `$` on a global, a polyfill it needs but never names, a top-level `this` that was the window. Putting the imports around the file before webpack parses it is enough — the parser reads them as the module's own, so they enter the module graph as ordinary dependencies and get whatever their module format allows. A `require` keeps the file the script it is, so the output below reports a CommonJS bailout for it; `ProvidePlugin` below, and an `import` in a file that tolerates one, are what buy the analysis.

No loader is needed for that. `NormalModule`'s `processResult` hook hands a plugin what the loaders produced — source, source map and any preparsed AST — and takes back a replacement. It is the same hook [adding exports](../add-exports) uses, from the other end of the file, and it is small enough to keep in the configuration.

Reach for it only for what it is for. A name the module merely **reads** is `ProvidePlugin`'s job: it binds the name where the module reads it, hoisted above the body, without touching the source. What is left for this plugin is a side-effect import the file never names, a real binding, and the wrapper below.

Two details the plugin has to respect, and one to know:

- A `"use strict"` directive stays the first statement, or prepending demotes it to an expression and the module silently turns sloppy. A source that left the directive unterminated needs the `;` its own next line would have supplied, or the prepended code runs into it.
- `before` ends without a newline, so nothing below it shifts and the source map still fits; `after` adds one line at the end, which shifts nothing above it.
- The wrapper is for scripts only. `import`/`export` may only appear at the top level, so wrapping an ES module in a function is a syntax error — an ES module already answers `undefined` for a top-level `this` anyway.

# webpack.config.js

```javascript
"use strict";

const { NormalModule } = require("../../");

/** @import { Compiler } from "../../" */

const PLUGIN_NAME = "AddImportsPlugin";

// A prepend before a directive would demote it to an expression, silently making
// the module sloppy, so the code goes after one.
const DIRECTIVE = /^\s*(["'])use strict\1;?/;

/** @type {[RegExp, { before?: string, after?: string }][]} */
const imports = [
	[
		/legacy-lib\.js$/,
		{
			// the polyfill for its side effects, `$` as a binding the script reads,
			// and a wrapper so its top-level `this` is the global object
			before:
				'require("./polyfill.js");var $ = require("./jquery.js");(function () {',
			after: "}).call(globalThis);"
		}
	]
];

/**
 * Puts code around modules which read values they never import, before webpack
 * parses them, so the imports are read as the module's own.
 * @param {Compiler} compiler the compiler instance
 * @returns {void}
 */
const addImports = (compiler) => {
	compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
		NormalModule.getCompilationHooks(compilation).processResult.tap(
			PLUGIN_NAME,
			(result, module) => {
				const [source, sourceMap] = result;
				for (const [test, { before = "", after = "" }] of imports) {
					// a global or sticky pattern keeps its lastIndex between calls,
					// which would skip the next module it is tested against
					test.lastIndex = 0;
					if (!module.resource || !test.test(module.resource)) continue;
					// a file no loader touched arrives as the buffer webpack read
					const code =
						typeof source === "string" ? source : source.toString("utf8");
					const directive = DIRECTIVE.exec(code);
					const at = directive ? directive[0].length : 0;
					// a directive its source left unterminated would run into `before`
					const end = directive && !directive[0].endsWith(";") ? ";" : "";
					// no newline after `before`: one would shift every line below it out
					// of the source map; a preparsed ast would be parsed instead of this
					return [
						`${code.slice(0, at)}${end}${before}${code.slice(at)}\n${after}`,
						sourceMap,
						undefined
					];
				}
				return result;
			}
		);
	});
};

/** @type {import("../../").Configuration} */
module.exports = {
	plugins: [addImports]
};
```

# example.js

```javascript
import legacy from "./legacy-lib";

console.log(legacy.render());
```

# legacy-lib.js

```javascript
"use strict"

// A script written for a `<script>` tag: it reads `$` as a global, reaches the
// global through `this`, and expects the polyfill to have run before it.
this.legacyLib = { version: "1.0.0" };

module.exports = {
	render() {
		return `${$(".app")} ${globalThis.legacySupport} v${globalThis.legacyLib.version}`;
	}
};
```

# jquery.js

```javascript
// A vendor library that a script expects on a global.
module.exports = function $(selector) {
	return `element(${selector})`;
};
```

# polyfill.js

```javascript
// A polyfill the script below expects to have run, but never names.
globalThis.legacySupport = "loaded";
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!***********************!*\
  !*** ./legacy-lib.js ***!
  \***********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module, __webpack_require__ */
/*! CommonJS bailout: module.exports is used directly at 7:0-14 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
__webpack_require__(/*! ./polyfill.js */ 2);var $ = __webpack_require__(/*! ./jquery.js */ 3);(function () {

// A script written for a `<script>` tag: it reads `$` as a global, reaches the
// global through `this`, and expects the polyfill to have run before it.
this.legacyLib = { version: "1.0.0" };

module.exports = {
	render() {
		return `${$(".app")} ${globalThis.legacySupport} v${globalThis.legacyLib.version}`;
	}
};

}).call(globalThis);

/***/ }),
/* 2 */
/*!*********************!*\
  !*** ./polyfill.js ***!
  \*********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
/***/ (() => {

// A polyfill the script below expects to have run, but never names.
globalThis.legacySupport = "loaded";


/***/ }),
/* 3 */
/*!*******************!*\
  !*** ./jquery.js ***!
  \*******************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 2:0-14 */
/***/ ((module) => {

// A vendor library that a script expects on a global.
module.exports = function $(selector) {
	return `element(${selector})`;
};


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
/* harmony import */ var _legacy_lib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./legacy-lib */ 1);
/* harmony import */ var _legacy_lib__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_legacy_lib__WEBPACK_IMPORTED_MODULE_0__);


console.log(_legacy_lib__WEBPACK_IMPORTED_MODULE_0___default().render());

})();

/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 4.78 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 725 bytes (javascript) 883 bytes (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 883 bytes 4 modules
  dependent modules 659 bytes [dependent] 3 modules
  ./example.js 66 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 895 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 725 bytes (javascript) 1.04 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 1.04 KiB 4 modules
  dependent modules 236 bytes [dependent] 2 modules
  ./example.js + 1 modules 489 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
