This is the app part.

The previously built vendor dll is used. The DllReferencePlugin reads the content of the dll from the manifest file and excludes all vendor modules from the compilation. Instead references to these modules will be loaded from the vendor dll via a global variable (`vendor_lib_xxxx`).

# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../../");

module.exports = {
	// mode: "development" || "production",
	context: __dirname,
	entry: "./example-app",
	output: {
		filename: "app.js",
		path: path.resolve(__dirname, "dist")
	},
	plugins: [
		new webpack.DllReferencePlugin({
			context: ".",
			manifest: require("../0-vendor/dist/vendor-manifest.json") // eslint-disable-line
		})
	]
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
		<script src="../0-vendor/js/vendor.js" charset="utf-8"></script>
		<script src="js/app.js" charset="utf-8"></script>
	</body>
</html>
```

# dist/app.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
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

``` javascript
/******/ ([
/* 0 */
/*!************************!*\
  !*** ./example-app.js ***!
  \************************/
/*! no exports provided */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__ */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var example_vendor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! example-vendor */ 1);


console.log(Object(example_vendor__WEBPACK_IMPORTED_MODULE_0__["square"])(7));
console.log(new example_vendor__WEBPACK_IMPORTED_MODULE_0__["square"](7));


/***/ }),
/* 1 */
/*!******************************************************************************************************!*\
  !*** delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_35e05f4ff28f09d4f9c3 ***!
  \******************************************************************************************************/
/*! exports provided: square */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference vendor_lib_35e05f4ff28f09d4f9c3 */ 2))(1);

/***/ }),
/* 2 */
/*!**************************************************!*\
  !*** external "vendor_lib_35e05f4ff28f09d4f9c3" ***!
  \**************************************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = vendor_lib_35e05f4ff28f09d4f9c3;

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
/******/ }
);
```

</details>


# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
 Asset     Size  Chunks             Chunk Names
app.js  3.3 KiB     {0}  [emitted]  main
Entrypoint main = app.js
chunk {0} app.js (main) 178 bytes (javascript) 279 bytes (runtime) [entry] [rendered]
    > ./example-app main
 [0] ./example-app.js 94 bytes {0} [built]
     [no exports]
     [used exports unknown]
     entry ./example-app main
 [1] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_35e05f4ff28f09d4f9c3 42 bytes {0} [built]
     [exports: square]
     [used exports unknown]
     harmony side effect evaluation example-vendor [0] ./example-app.js 1:0-40
     harmony import specifier example-vendor [0] ./example-app.js 3:12-18
     harmony import specifier example-vendor [0] ./example-app.js 4:16-22
 [2] external "vendor_lib_35e05f4ff28f09d4f9c3" 42 bytes {0} [built]
     [used exports unknown]
     delegated source dll-reference vendor_lib_35e05f4ff28f09d4f9c3 [1] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_35e05f4ff28f09d4f9c3
     + 1 hidden chunk module
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
 Asset       Size  Chunks             Chunk Names
app.js  591 bytes   {404}  [emitted]  main
Entrypoint main = app.js
chunk {404} app.js (main) 178 bytes (javascript) 279 bytes (runtime) [entry] [rendered]
    > ./example-app main
 [423] ./example-app.js 94 bytes {404} [built]
       [no exports]
       entry ./example-app main
 [492] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_35e05f4ff28f09d4f9c3 42 bytes {404} [built]
       [exports: square]
       harmony side effect evaluation example-vendor [423] ./example-app.js 1:0-40
       harmony import specifier example-vendor [423] ./example-app.js 3:12-18
       harmony import specifier example-vendor [423] ./example-app.js 4:16-22
 [656] external "vendor_lib_35e05f4ff28f09d4f9c3" 42 bytes {404} [built]
       delegated source dll-reference vendor_lib_35e05f4ff28f09d4f9c3 [492] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_35e05f4ff28f09d4f9c3
     + 1 hidden chunk module
```

<!-- @TODO:
  - [ ] examples/dll-mode-and-context
  - [ ] examples/dll-multiple
  - [ ] examples/dll-dependencies
-->
