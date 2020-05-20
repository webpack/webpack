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
/* 0 */,
/* 1 */
/*!******************************************************************************************************!*\
  !*** delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_c6c2f689b0bad44474d1 ***!
  \******************************************************************************************************/
/*! namespace exports */
/*! export square [provided] [used] [provision prevents renaming] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference vendor_lib_c6c2f689b0bad44474d1 */ 2))(1);

/***/ }),
/* 2 */
/*!**************************************************!*\
  !*** external "vendor_lib_c6c2f689b0bad44474d1" ***!
  \**************************************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
module.exports = vendor_lib_c6c2f689b0bad44474d1;

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
```

</details>

``` js
(() => {
"use strict";
/*!************************!*\
  !*** ./example-app.js ***!
  \************************/
/*! namespace exports */
/*! exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__ */
/* harmony import */ var example_vendor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! example-vendor */ 1);


console.log((0,example_vendor__WEBPACK_IMPORTED_MODULE_0__.square)(7));
console.log(new example_vendor__WEBPACK_IMPORTED_MODULE_0__.square(7));

})();

/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
 Asset      Size
app.js  2.67 KiB  [emitted]  [name: main]
Entrypoint main = app.js
chunk app.js (main) 178 bytes [entry] [rendered]
    > ./example-app main
 ./example-app.js 94 bytes [built]
     [no exports]
     [no exports used]
     entry ./example-app main
 delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_c6c2f689b0bad44474d1 42 bytes [built]
     [exports: square]
     [all exports used]
     harmony side effect evaluation example-vendor ./example-app.js 1:0-40
     harmony import specifier example-vendor ./example-app.js 3:12-18
     harmony import specifier example-vendor ./example-app.js 4:16-22
 external "vendor_lib_c6c2f689b0bad44474d1" 42 bytes [built]
     delegated source dll-reference vendor_lib_c6c2f689b0bad44474d1 delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_c6c2f689b0bad44474d1
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
 Asset       Size
app.js  319 bytes  [emitted]  [name: main]
Entrypoint main = app.js
chunk app.js (main) 178 bytes [entry] [rendered]
    > ./example-app main
 ./example-app.js 94 bytes [built]
     [no exports]
     [no exports used]
     entry ./example-app main
 delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_c6c2f689b0bad44474d1 42 bytes [built]
     [exports: square]
     [all exports used]
     harmony side effect evaluation example-vendor ./example-app.js 1:0-40
     harmony import specifier example-vendor ./example-app.js 3:12-18
     harmony import specifier example-vendor ./example-app.js 4:16-22
 external "vendor_lib_c6c2f689b0bad44474d1" 42 bytes [built]
     delegated source dll-reference vendor_lib_c6c2f689b0bad44474d1 delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_c6c2f689b0bad44474d1
```

<!-- @TODO:
  - [ ] examples/dll-mode-and-context
  - [ ] examples/dll-multiple
  - [ ] examples/dll-dependencies
-->
