This is the vendor build part.

It's built separately from the app part. The vendors dll is only built when the array of vendors has changed and not during the normal development cycle.

The DllPlugin in combination with the `output.library` option exposes the internal require function as global variable in the target environment.

A manifest is created which includes mappings from module names to internal ids.

### webpack.config.js

```javascript
var path = require("path");
var webpack = require("../../../");

module.exports = {
	// mode: "development || "production",
	context: __dirname,
	entry: ["example-vendor"],
	output: {
		filename: "vendor.js", // best use [fullhash] here too
		path: path.resolve(__dirname, "dist"),
		library: "vendor_lib_[fullhash]"
	},
	plugins: [
		new webpack.DllPlugin({
			name: "vendor_lib_[fullhash]",
			path: path.resolve(__dirname, "dist/vendor-manifest.json")
		})
	]
};
```

# example-vendor

```javascript
export function square(n) {
	return n * n;
}
```

# dist/vendor.js

```javascript
var vendor_lib_51062e5e93ee3a0507e7;
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!****************!*\
  !*** dll main ***!
  \****************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__, module */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!*****************************************!*\
  !*** ../node_modules/example-vendor.js ***!
  \*****************************************/
/*! namespace exports */
/*! export square [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "square": () => (/* binding */ square)
/* harmony export */ });
function square(n) {
	return n * n;
}


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
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module doesn't tell about it's top-level declarations so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	vendor_lib_51062e5e93ee3a0507e7 = __webpack_exports__;
/******/ 	
/******/ })()
;
```

# dist/vendor-manifest.json

```javascript
{"name":"vendor_lib_51062e5e93ee3a0507e7","content":{"../node_modules/example-vendor.js":{"id":1,"buildMeta":{"exportsType":"namespace"},"exports":["square"]}}}
```

# Info

## Unoptimized

```
asset vendor.js 3.68 KiB [emitted] (name: main)
chunk (runtime: main) vendor.js (main) 57 bytes (javascript) 670 bytes (runtime) [entry] [rendered]
  > main
  runtime modules 670 bytes 3 modules
  dependent modules 45 bytes [dependent] 1 module
  dll main 12 bytes [built] [code generated]
    [used exports unknown]
    dll entry
    used as library export
webpack 5.51.1 compiled successfully
```

## Production mode

```
asset vendor.js 653 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) vendor.js (main) 57 bytes (javascript) 670 bytes (runtime) [entry] [rendered]
  > main
  runtime modules 670 bytes 3 modules
  dependent modules 45 bytes [dependent] 1 module
  dll main 12 bytes [built] [code generated]
    dll entry
    used as library export
webpack 5.51.1 compiled successfully
```
