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
var vendor_lib_ced36e0133f6a1f67f40 =
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
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(0);
/******/ 	};
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// run startup
/******/ 	return startup();
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
/*! other exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_require__module,  */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!*****************************************!*\
  !*** ../node_modules/example-vendor.js ***!
  \*****************************************/
/*! export square [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_require__.r__webpack_exports__, __webpack_require__.d, __webpack_require__,  */
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

```javascript
{"name":"vendor_lib_ced36e0133f6a1f67f40","content":{"../node_modules/example-vendor.js":{"id":1,"buildMeta":{"exportsType":"namespace"},"exports":["square"]}}}
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.11
    Asset      Size  Chunks             Chunk Names
vendor.js  3.42 KiB     {0}  [emitted]  main
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
Version: webpack 5.0.0-alpha.11
    Asset       Size  Chunks             Chunk Names
vendor.js  674 bytes   {179}  [emitted]  main
Entrypoint main = vendor.js
chunk {179} vendor.js (main) 57 bytes (javascript) 560 bytes (runtime) [entry] [rendered]
    > main
 [442] ../node_modules/example-vendor.js 45 bytes {179} [built]
       [exports: square]
       entry example-vendor [550] dll main main[0]
       DllPlugin
 [550] dll main 12 bytes {179} [built]
       dll entry
       DllPlugin
     + 2 hidden chunk modules
```
