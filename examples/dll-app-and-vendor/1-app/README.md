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
			context: ".",
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

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

```javascript
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
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
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
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
```

</details>

```javascript
/******/ ([
/* 0 */
/*!************************!*\
  !*** ./example-app.js ***!
  \************************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var example_vendor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! example-vendor */ 1);


console.log(Object(example_vendor__WEBPACK_IMPORTED_MODULE_0__["square"])(7));
console.log(new example_vendor__WEBPACK_IMPORTED_MODULE_0__["square"](7));


/***/ }),
/* 1 */
/*!******************************************************************************************************!*\
  !*** delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_a132d30959ef28c3f004 ***!
  \******************************************************************************************************/
/*! exports provided: square */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference vendor_lib_a132d30959ef28c3f004 */ 2))(1);

/***/ }),
/* 2 */
/*!**************************************************!*\
  !*** external "vendor_lib_a132d30959ef28c3f004" ***!
  \**************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = vendor_lib_a132d30959ef28c3f004;

/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
 Asset      Size  Chunks             Chunk Names
app.js  4.86 KiB       0  [emitted]  main
Entrypoint main = app.js
chunk    {0} app.js (main) 178 bytes [entry] [rendered]
    > ./example-app main
 [0] ./example-app.js 94 bytes {0} [built]
     [no exports]
     single entry ./example-app  main
 [1] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_a132d30959ef28c3f004 42 bytes {0} [built]
     [exports: square]
     harmony side effect evaluation example-vendor [0] ./example-app.js 1:0-40
     harmony import specifier example-vendor [0] ./example-app.js 3:12-18
     harmony import specifier example-vendor [0] ./example-app.js 4:16-22
 [2] external "vendor_lib_a132d30959ef28c3f004" 42 bytes {0} [built]
     delegated source dll-reference vendor_lib_a132d30959ef28c3f004 [1] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_a132d30959ef28c3f004
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
 Asset      Size  Chunks             Chunk Names
app.js  1.09 KiB       0  [emitted]  main
Entrypoint main = app.js
chunk    {0} app.js (main) 178 bytes [entry] [rendered]
    > ./example-app main
 [0] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_a132d30959ef28c3f004 42 bytes {0} [built]
     [exports: square]
     harmony side effect evaluation example-vendor [1] ./example-app.js 1:0-40
     harmony import specifier example-vendor [1] ./example-app.js 3:12-18
     harmony import specifier example-vendor [1] ./example-app.js 4:16-22
 [1] ./example-app.js 94 bytes {0} [built]
     [no exports]
     single entry ./example-app  main
 [2] external "vendor_lib_a132d30959ef28c3f004" 42 bytes {0} [built]
     delegated source dll-reference vendor_lib_a132d30959ef28c3f004 [0] delegated ../node_modules/example-vendor.js from dll-reference vendor_lib_a132d30959ef28c3f004
```

<!-- @TODO:
  - [ ] examples/dll-mode-and-context
  - [ ] examples/dll-multiple
  - [ ] examples/dll-dependencies
-->
