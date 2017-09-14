This is the vendor build part.

It's built separatly from the app part. The vendors dll is only built when vendors has changed and not while the normal development cycle.

The DllPlugin in combination with the `output.library` option exposes the internal require function as global variable in the target enviroment.

A manifest is creates which includes mappings from module names to internal ids.

### webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../../");

module.exports = {
	context: __dirname,
	entry: ["example-vendor"],
	output: {
		filename: "vendor.js", // best use [hash] here too
		path: path.resolve(__dirname, "js"),
		library: "vendor_lib_[hash]",
	},
	plugins: [
		new webpack.DllPlugin({
			name: "vendor_lib_[hash]",
			path: path.resolve(__dirname, "js/vendor-manifest.json"),
		}),
	],
};
```

# example-vendor

``` javascript
export function square(n) {
	return n * n;
}
```

# js/vendor.js

``` javascript
var vendor_lib_6b1edee0549eb5092709 =
```
<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` js
/******/ (function(modules) { // webpackBootstrap
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
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
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
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!*****************************************!*\
  !*** ../node_modules/example-vendor.js ***!
  \*****************************************/
/*! exports provided: square */
/*! all exports used */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (immutable) */ __webpack_exports__["square"] = square;
function square(n) {
	return n * n;
}


/***/ })
/******/ ]);
```

# js/vendor-manifest.json

``` javascript
{"name":"vendor_lib_6b1edee0549eb5092709","content":{"../node_modules/example-vendor.js":{"id":1,"meta":{"harmonyModule":true},"exports":["square"]}}}
```

# Info

## Uncompressed

```
Hash: 6b1edee0549eb5092709
Version: webpack 3.5.1
    Asset     Size  Chunks             Chunk Names
vendor.js  3.18 kB       0  [emitted]  main
Entrypoint main = vendor.js
chunk    {0} vendor.js (main) 60 bytes [entry] [rendered]
    > main [0] dll main 
    [0] dll main 12 bytes {0} [built]
     + 1 hidden module
```

## Minimized (uglify-js, no zip)

```
Hash: 6b1edee0549eb5092709
Version: webpack 3.5.1
    Asset       Size  Chunks             Chunk Names
vendor.js  652 bytes       0  [emitted]  main
Entrypoint main = vendor.js
chunk    {0} vendor.js (main) 60 bytes [entry] [rendered]
    > main [0] dll main 
    [0] dll main 12 bytes {0} [built]
     + 1 hidden module
```

