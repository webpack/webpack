This is the app part.

The previously built vendor dll is used. The DllReferencePlugin reads the content of the dll from the manifest file and excludes all vendor modules from the compilation. Instead references to these modules will be loaded from the vendor dll via a global variable (`vendor_lib_xxxx`).

# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../../");

module.exports = {
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

``` javascript
/******/ ([
/* 0 */
/*!************************!*\
  !*** ./example-app.js ***!
  \************************/
/*! exports provided:  */
/*! all exports used */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_example_vendor__ = __webpack_require__(/*! example-vendor */ 1);


console.log(Object(__WEBPACK_IMPORTED_MODULE_0_example_vendor__["square"])(7));
console.log(new __WEBPACK_IMPORTED_MODULE_0_example_vendor__["square"](7));


/***/ }),
/* 1 */
/*!******************************************************************************************************!*\
  !*** delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_6b1edee0549eb5092709 ***!
  \******************************************************************************************************/
/*! exports provided: square */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(2))(1);

/***/ }),
/* 2 */
/*!**************************************************!*\
  !*** external "vendor_lib_6b1edee0549eb5092709" ***!
  \**************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = vendor_lib_6b1edee0549eb5092709;

/***/ })
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 26778169dabaf1f3965d
Version: webpack 3.5.1
 Asset     Size  Chunks             Chunk Names
app.js  3.85 kB       0  [emitted]  main
Entrypoint main = app.js
chunk    {0} app.js (main) 182 bytes [entry] [rendered]
    > main [0] ./example-app.js 
    [0] ./example-app.js 98 bytes {0} [built]
        [no exports]
    [1] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_6b1edee0549eb5092709 42 bytes {0} [built]
        [exports: square]
        harmony import example-vendor [0] ./example-app.js 1:0-40
     + 1 hidden module
```

## Minimized (uglify-js, no zip)

```
Hash: 26778169dabaf1f3965d
Version: webpack 3.5.1
 Asset       Size  Chunks             Chunk Names
app.js  710 bytes       0  [emitted]  main
Entrypoint main = app.js
chunk    {0} app.js (main) 182 bytes [entry] [rendered]
    > main [0] ./example-app.js 
    [0] ./example-app.js 98 bytes {0} [built]
        [no exports]
    [1] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_6b1edee0549eb5092709 42 bytes {0} [built]
        [exports: square]
        harmony import example-vendor [0] ./example-app.js 1:0-40
     + 1 hidden module
```

<!-- @TODO:
  - [ ] examples/dll-mode-and-context
  - [ ] examples/dll-multiple
  - [ ] examples/dll-dependencies
-->
