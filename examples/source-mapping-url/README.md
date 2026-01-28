This example demonstrates various types of source-maps.

# example.js

```js
import { greet } from "library";

// Valid value
console.log(greet("world"));
// Wrong value
console.log(greet(128));
```

# node_modules/library/src/index.ts

```typescript
const greet = (name: string) => {
	if (typeof name !== "string") {
		throw new TypeError("Invalid name type");
	}

	return `Hello, ${name}!`;
};

export { greet }
```

# node_modules/library/lib/index.js

```js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.greet = void 0;
var greet = function (name) {
    if (typeof name !== "string") {
        throw new TypeError("Invalid name type");
    }
    return "Hello, ".concat(name, "!");
};
exports.greet = greet;
//# sourceMappingURL=index.js.map
```

# node_modules/library/lib/index.js.map

```json
{"version":3,"file":"index.js","sourceRoot":"","sources":["../src/index.ts"],"names":[],"mappings":";;;AAAA,IAAM,KAAK,GAAG,UAAC,IAAY;IAC1B,IAAI,OAAO,IAAI,KAAK,QAAQ,EAAE,CAAC;QAC9B,MAAM,IAAI,SAAS,CAAC,mBAAmB,CAAC,CAAC;IAC1C,CAAC;IAED,OAAO,iBAAU,IAAI,MAAG,CAAC;AAC1B,CAAC,CAAC;AAEO,sBAAK"}
```

# webpack.config.js

```javascript
"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	mode: "development",
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.js$/i,
				extractSourceMap: true
			}
		]
	}
};

module.exports = config;
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!*******************************************!*\
  !*** ./node_modules/library/lib/index.js ***!
  \*******************************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export greet [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.greet = void 0;
var greet = function (name) {
    if (typeof name !== "string") {
        throw new TypeError("Invalid name type");
    }
    return "Hello, ".concat(name, "!");
};
exports.greet = greet;


/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
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
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
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
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var library__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! library */ 1);


// Valid value
console.log((0,library__WEBPACK_IMPORTED_MODULE_0__.greet)("world"));
// Wrong value
console.log((0,library__WEBPACK_IMPORTED_MODULE_0__.greet)(128));

})();

/******/ })()
;
//# sourceMappingURL=output.js.map
```

# dist/output.js.map

```json
{"version":3,"file":"output.js","mappings":";;;;;;;;;;;;;;;;;;AAAA,IAAM,KAAK,GAAG,UAAC,IAAY;IAC1B,IAAI,OAAO,IAAI,KAAK,QAAQ,EAAE,CAAC;QAC9B,MAAM,IAAI,SAAS,CAAC,mBAAmB,CAAC,CAAC;IAC1C,CAAC;IAED,OAAO,iBAAU,IAAI,MAAG,CAAC;AAC1B,CAAC,CAAC;AAEO,sBAAK;;;;;;UCRd;UACA;;UAEA;UACA;UACA;UACA;UACA;UACA;UACA;UACA;UACA;UACA;UACA;UACA;UACA;UACA;UACA;UACA;UACA;UACA;UACA;;UAEA;UACA;;UAEA;UACA;UACA;;;;;WC5BA;WACA;WACA;WACA,uDAAuD,iBAAiB;WACxE;WACA,gDAAgD,aAAa;WAC7D,E;;;;;;;;;;;;;;;ACNgC;;AAEhC;AACA,YAAY,8CAAK;AACjB;AACA,YAAY,8CAAK","sources":["webpack:///./node_modules/library/src/index.ts","webpack:///webpack/bootstrap","webpack:///webpack/runtime/make namespace object","webpack:///./example.js"],"sourcesContent":["const greet = (name: string) => {\n\tif (typeof name !== \"string\") {\n\t\tthrow new TypeError(\"Invalid name type\");\n\t}\n\n\treturn `Hello, ${name}!`;\n};\n\nexport { greet }\n","// The module cache\nvar __webpack_module_cache__ = {};\n\n// The require function\nfunction __webpack_require__(moduleId) {\n\t// Check if module is in cache\n\tvar cachedModule = __webpack_module_cache__[moduleId];\n\tif (cachedModule !== undefined) {\n\t\treturn cachedModule.exports;\n\t}\n\t// Check if module exists (development only)\n\tif (__webpack_modules__[moduleId] === undefined) {\n\t\tvar e = new Error(\"Cannot find module '\" + moduleId + \"'\");\n\t\te.code = 'MODULE_NOT_FOUND';\n\t\tthrow e;\n\t}\n\t// Create a new module (and put it into the cache)\n\tvar module = __webpack_module_cache__[moduleId] = {\n\t\t// no module.id needed\n\t\t// no module.loaded needed\n\t\texports: {}\n\t};\n\n\t// Execute the module function\n\t__webpack_modules__[moduleId](module, module.exports, __webpack_require__);\n\n\t// Return the exports of the module\n\treturn module.exports;\n}\n\n","// define __esModule on exports\n__webpack_require__.r = (exports) => {\n\tif(typeof Symbol !== 'undefined' && Symbol.toStringTag) {\n\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });\n\t}\n\tObject.defineProperty(exports, '__esModule', { value: true });\n};","import { greet } from \"library\";\n\n// Valid value\nconsole.log(greet(\"world\"));\n// Wrong value\nconsole.log(greet(128));\n"],"names":[],"sourceRoot":""}
```

# Info

## Unoptimized

```
asset output.js 3.43 KiB [emitted] (name: main) 1 related asset
chunk (runtime: main) output.js (main) 407 bytes (javascript) 274 bytes (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 289 bytes [dependent] 1 module
  runtime modules 274 bytes 1 module
  ./example.js 118 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 383 bytes [emitted] [minimized] (name: main) 1 related asset
chunk (runtime: main) output.js (main) 407 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 289 bytes [dependent] 1 module
  ./example.js 118 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
