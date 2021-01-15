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
/*! namespace exports */
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
  !*** delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_d696c7b4f72a4a70f39b ***!
  \******************************************************************************************************/
/*! namespace exports */
/*! export square [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference vendor_lib_d696c7b4f72a4a70f39b */ 2))(1);

/***/ }),
/* 2 */
/*!**************************************************!*\
  !*** external "vendor_lib_d696c7b4f72a4a70f39b" ***!
  \**************************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
module.exports = vendor_lib_d696c7b4f72a4a70f39b;

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
asset app.js 3.52 KiB [emitted] (name: main)
chunk (runtime: main) app.js (main) 178 bytes (javascript) 274 bytes (runtime) [entry] [rendered]
  > ./example-app main
  dependent modules 84 bytes [dependent] 2 modules
  runtime modules 274 bytes 1 module
  ./example-app.js 94 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example-app main
webpack 5.11.1 compiled successfully
```

## Production mode

```
asset app.js 319 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) app.js (main) 178 bytes [entry] [rendered]
  > ./example-app main
  dependent modules 84 bytes [dependent] 2 modules
  ./example-app.js 94 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example-app main
webpack 5.11.1 compiled successfully
```

<!-- @TODO:
  - [ ] examples/dll-mode-and-context
  - [ ] examples/dll-multiple
  - [ ] examples/dll-dependencies
-->
