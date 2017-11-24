This is the app part.

The previously built vendor dll is used. The DllReferencePlugin reads the content of the dll from the manifest file and excludes all vendor modules from the compilation. Instead references to these modules will be loaded from the vendor dll via a global variable (`vendor_lib_xxxx`).

# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../../");

module.exports = {
	mode: "production",
	context: __dirname,
	entry: "./example-app",
	output: {
		filename: "app.js",
		path: path.resolve(__dirname, "js"),
	},
	plugins: [
		new webpack.DllReferencePlugin({
			context: ".",
			manifest: require("../0-vendor/js/vendor-manifest.json"), // eslint-disable-line
		}),
	],
};
```

# example-app.js

``` javascript
import { square } from "example-vendor";

console.log(square(7));
console.log(new square(7));
```

# example.html

``` html
<html>
	<head></head>
	<body>
		<script src="js/vendor.bundle.js" charset="utf-8"></script>
		<script src="js/app.bundle.js" charset="utf-8"></script>
	</body>
</html>
```

# js/app.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
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
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
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
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!******************************************************************************************************!*\
  !*** delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_668eb208c131c5341859 ***!
  \******************************************************************************************************/
/*! exports provided: square */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(2))(1);

/***/ }),
/* 1 */
/*!************************!*\
  !*** ./example-app.js ***!
  \************************/
/*! no exports provided */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is an entry point */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var example_vendor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! example-vendor */0);


console.log(Object(example_vendor__WEBPACK_IMPORTED_MODULE_0__["square"])(7));
console.log(new example_vendor__WEBPACK_IMPORTED_MODULE_0__["square"](7));


/***/ }),
/* 2 */
/*!**************************************************!*\
  !*** external "vendor_lib_668eb208c131c5341859" ***!
  \**************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {

module.exports = vendor_lib_668eb208c131c5341859;

/***/ })
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 04a51b52310382404203
Version: webpack next
 Asset      Size  Chunks             Chunk Names
app.js  4.11 KiB       0  [emitted]  main
Entrypoint main = app.js
chunk    {0} app.js (main) 182 bytes [entry] [rendered]
    > main [1] ./example-app.js 
    [0] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_668eb208c131c5341859 42 bytes {0} [built]
        [exports: square]
        harmony side effect evaluation example-vendor [1] ./example-app.js 1:0-40
        harmony import specifier example-vendor [1] ./example-app.js 3:12-18
        harmony import specifier example-vendor [1] ./example-app.js 4:16-22
    [1] ./example-app.js 98 bytes {0} [built]
        [no exports]
        single entry ./example-app  main
    [2] external "vendor_lib_668eb208c131c5341859" 42 bytes {0} [built]
        delegated source dll-reference vendor_lib_668eb208c131c5341859 [0] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_668eb208c131c5341859
```

## Minimized (uglify-js, no zip)

```
Hash: 04a51b52310382404203
Version: webpack next
 Asset       Size  Chunks             Chunk Names
app.js  734 bytes       0  [emitted]  main
Entrypoint main = app.js
chunk    {0} app.js (main) 182 bytes [entry] [rendered]
    > main [1] ./example-app.js 
    [0] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_668eb208c131c5341859 42 bytes {0} [built]
        [exports: square]
        harmony side effect evaluation example-vendor [1] ./example-app.js 1:0-40
        harmony import specifier example-vendor [1] ./example-app.js 3:12-18
        harmony import specifier example-vendor [1] ./example-app.js 4:16-22
    [1] ./example-app.js 98 bytes {0} [built]
        [no exports]
        single entry ./example-app  main
    [2] external "vendor_lib_668eb208c131c5341859" 42 bytes {0} [built]
        delegated source dll-reference vendor_lib_668eb208c131c5341859 [0] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_668eb208c131c5341859
```

<!-- @TODO:
  - [ ] examples/dll-mode-and-context
  - [ ] examples/dll-multiple
  - [ ] examples/dll-dependencies
-->
