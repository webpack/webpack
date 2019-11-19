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
var vendor_lib_02cb05c865a84081bc8b =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!****************!*\
  !*** dll main ***!
  \****************/
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_require__, module */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!*****************************************!*\
  !*** ../node_modules/example-vendor.js ***!
  \*****************************************/
/*! export square [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.r, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "square": () => /* binding */ square
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
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(hasOwnProperty.call(definition, key) && !hasOwnProperty.call(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })()
;
```

# dist/vendor-manifest.json

```javascript
{"name":"vendor_lib_02cb05c865a84081bc8b","content":{"../node_modules/example-vendor.js":{"id":1,"buildMeta":{"exportsType":"namespace","async":false},"exports":["square"]}}}
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
    Asset      Size
vendor.js  3.48 KiB  [emitted]  [name: main]
Entrypoint main = vendor.js
chunk vendor.js (main) 57 bytes (javascript) 632 bytes (runtime) [entry] [rendered]
    > main
 ../node_modules/example-vendor.js 45 bytes [built]
     [exports: square]
     entry example-vendor dll main main[0]
     DllPlugin
 dll main 12 bytes [built]
     dll entry
     used a library export
     DllPlugin
     + 2 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
    Asset       Size
vendor.js  627 bytes  [emitted]  [name: main]
Entrypoint main = vendor.js
chunk vendor.js (main) 57 bytes (javascript) 632 bytes (runtime) [entry] [rendered]
    > main
 ../node_modules/example-vendor.js 45 bytes [built]
     [exports: square]
     entry example-vendor dll main main[0]
     DllPlugin
 dll main 12 bytes [built]
     dll entry
     used a library export
     DllPlugin
     + 2 hidden chunk modules
```
