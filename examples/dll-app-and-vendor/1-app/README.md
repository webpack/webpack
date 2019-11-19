This is the app part.

The previously built vendor dll is used. The DllReferencePlugin reads the content of the dll from the manifest file and excludes all vendor modules from the compilation. Instead references to these modules will be loaded from the vendor dll via a global variable (`vendor_lib_xxxx`).

# webpack.config.js

```javascript
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
			manifest: require("../0-vendor/dist/vendor-manifest.json") // eslint-disable-line
		})
	]
};
```

# example-app.js

```javascript
import { square } from "example-vendor";

console.log(square(7));
console.log(new square(7));
```

# example.html

```html
<html>
	<head></head>
	<body>
		<script src="../0-vendor/js/vendor.js" charset="utf-8"></script>
		<script src="js/app.js" charset="utf-8"></script>
	</body>
</html>
```

# dist/app.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!************************!*\
  !*** ./example-app.js ***!
  \************************/
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var example_vendor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! example-vendor */ 1);


console.log((0,example_vendor__WEBPACK_IMPORTED_MODULE_0__.square)(7));
console.log(new example_vendor__WEBPACK_IMPORTED_MODULE_0__.square(7));


/***/ }),
/* 1 */
/*!******************************************************************************************************!*\
  !*** delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_02cb05c865a84081bc8b ***!
  \******************************************************************************************************/
/*! export square [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference vendor_lib_02cb05c865a84081bc8b */ 2))(1);

/***/ }),
/* 2 */
/*!**************************************************!*\
  !*** external "vendor_lib_02cb05c865a84081bc8b" ***!
  \**************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
module.exports = vendor_lib_02cb05c865a84081bc8b;

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
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__(0);
/******/ 	// This entry module used 'exports' so it can't be inlined
/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
 Asset     Size
app.js  3.5 KiB  [emitted]  [name: main]
Entrypoint main = app.js
chunk app.js (main) 178 bytes (javascript) 274 bytes (runtime) [entry] [rendered]
    > ./example-app main
 ./example-app.js 94 bytes [built]
     [no exports]
     [used exports unknown]
     entry ./example-app main
 delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_02cb05c865a84081bc8b 42 bytes [built]
     [exports: square]
     [used exports unknown]
     harmony side effect evaluation example-vendor ./example-app.js 1:0-40
     harmony import specifier example-vendor ./example-app.js 3:12-18
     harmony import specifier example-vendor ./example-app.js 4:16-22
 external "vendor_lib_02cb05c865a84081bc8b" 42 bytes [built]
     [used exports unknown]
     delegated source dll-reference vendor_lib_02cb05c865a84081bc8b delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_02cb05c865a84081bc8b
     + 1 hidden chunk module
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
 Asset       Size
app.js  340 bytes  [emitted]  [name: main]
Entrypoint main = app.js
chunk app.js (main) 178 bytes [entry] [rendered]
    > ./example-app main
 ./example-app.js 94 bytes [built]
     [no exports]
     [no exports used]
     entry ./example-app main
 delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_02cb05c865a84081bc8b 42 bytes [built]
     [exports: square]
     [all exports used]
     harmony side effect evaluation example-vendor ./example-app.js 1:0-40
     harmony import specifier example-vendor ./example-app.js 3:12-18
     harmony import specifier example-vendor ./example-app.js 4:16-22
 external "vendor_lib_02cb05c865a84081bc8b" 42 bytes [built]
     delegated source dll-reference vendor_lib_02cb05c865a84081bc8b delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_02cb05c865a84081bc8b
```

<!-- @TODO:
  - [ ] examples/dll-mode-and-context
  - [ ] examples/dll-multiple
  - [ ] examples/dll-dependencies
-->
