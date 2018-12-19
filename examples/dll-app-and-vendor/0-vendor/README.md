This is the vendor build part.

It's built separately from the app part. The vendors dll is only built when the array of vendors has changed and not during the normal development cycle.

The DllPlugin in combination with the `output.library` option exposes the internal require function as global variable in the target environment.

A manifest is created which includes mappings from module names to internal ids.

### webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../../");

module.exports = {
	// mode: "development || "production",
	context: __dirname,
	entry: ["example-vendor"],
	output: {
		filename: "vendor.js", // best use [hash] here too
		path: path.resolve(__dirname, "dist"),
		library: "vendor_lib_[hash]"
	},
	plugins: [
		new webpack.DllPlugin({
			name: "vendor_lib_[hash]",
			path: path.resolve(__dirname, "dist/vendor-manifest.json")
		})
	]
};
```

# example-vendor

``` javascript
export function square(n) {
	return n * n;
}
```

# dist/vendor.js

``` javascript
var vendor_lib_35e05f4ff28f09d4f9c3 =
```
<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` js
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
```

</details>

``` js
/******/ ([
/* 0 */
/*!****************!*\
  !*** dll main ***!
  \****************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, module */
/*! all exports used */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!*****************************************!*\
  !*** ../node_modules/example-vendor.js ***!
  \*****************************************/
/*! exports provided: square */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__ */
/*! all exports used */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "square", function() { return square; });
function square(n) {
	return n * n;
}


/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getter */
/******/ 	!function() {
/******/ 		// define getter function for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = function(exports, name, getter) {
/******/ 			if(!hasOwnProperty.call(exports, name)) {
/******/ 				Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# dist/vendor-manifest.json

``` javascript
{"name":"vendor_lib_35e05f4ff28f09d4f9c3","content":{"../node_modules/example-vendor.js":{"id":1,"buildMeta":{"exportsType":"namespace","providedExports":["square"]}}}}
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset      Size  Chunks             Chunk Names
vendor.js  3.16 KiB     {0}  [emitted]  main
Entrypoint main = vendor.js
chunk {0} vendor.js (main) 57 bytes (javascript) 560 bytes (runtime) [entry] [rendered]
    > main
 [0] dll main 12 bytes {0} [built]
     dll entry
     DllPlugin
 [1] ../node_modules/example-vendor.js 45 bytes {0} [built]
     [exports: square]
     entry example-vendor [0] dll main main[0]
     DllPlugin
     + 2 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset       Size  Chunks             Chunk Names
vendor.js  674 bytes   {404}  [emitted]  main
Entrypoint main = vendor.js
chunk {404} vendor.js (main) 57 bytes (javascript) 560 bytes (runtime) [entry] [rendered]
    > main
 [507] dll main 12 bytes {404} [built]
       dll entry
       DllPlugin
 [797] ../node_modules/example-vendor.js 45 bytes {404} [built]
       [exports: square]
       entry example-vendor [507] dll main main[0]
       DllPlugin
     + 2 hidden chunk modules
```

