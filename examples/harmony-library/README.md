# webpack.config.js

```javascript
var path = require("path");
module.exports = {
	// mode: "development || "production",
	entry: "./example",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "MyLibrary.umd.js",
		library: "MyLibrary",
		libraryTarget: "umd"
	}
};
```

# dist/MyLibrary.umd.js

```javascript
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["MyLibrary"] = factory();
	else
		root["MyLibrary"] = factory();
})(self, function() {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
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
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! export default [provided] [maybe used in main (runtime-defined)] [usage prevents renaming] */
/*! export increment [provided] [maybe used in main (runtime-defined)] [usage prevents renaming] */
/*! export value [provided] [maybe used in main (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used in main (runtime-defined)] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "value": () => (/* binding */ value),
/* harmony export */   "increment": () => (/* binding */ increment),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
var value = 0;
function increment() {
	value++;
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("MyLibrary");

/******/ 	return __webpack_exports__;
/******/ })()
;
});
```

# Info

## Unoptimized

```
asset MyLibrary.umd.js 2.89 KiB [emitted] (name: main)
chunk (runtime: main) MyLibrary.umd.js (main) 92 bytes (javascript) 670 bytes (runtime) [entry] [rendered]
  > ./example main
  runtime modules 670 bytes 3 modules
  ./example.js 92 bytes [built] [code generated]
    [exports: default, increment, value]
    [used exports unknown]
    entry ./example main
    used as library export
webpack 5.51.1 compiled successfully
```

## Production mode

```
asset MyLibrary.umd.js 688 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) MyLibrary.umd.js (main) 92 bytes (javascript) 670 bytes (runtime) [entry] [rendered]
  > ./example main
  runtime modules 670 bytes 3 modules
  ./example.js 92 bytes [built] [code generated]
    [exports: default, increment, value]
    entry ./example main
    used as library export
webpack 5.51.1 compiled successfully
```
