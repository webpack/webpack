# Dll App and Vendor

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

[Based on this gist](https://gist.github.com/Eoksni/83d1f1559e0ec00d0e89c33a6d763049)

For the sake of ease in the example, both `webpack.vendor.config` (dll plugin)  & `webpack.app.config` (dll reference plugin) are exported in `webpack.config` in an array.

In the real world, one would likely not build vendor every time, but would build when needed (with a separate build command such as `webpack --config webpack.app.config`), which is why they are separate files.


# Configs

### webpack.app.config.js

``` javascript
var path = require("path");
var webpack = require("../../");

module.exports = {
	context: __dirname,
	entry: {
		app: ["./example-app"],
	},
	output: {
		filename: "app.bundle.js",
		path: path.resolve(__dirname, "./js"),
	},
	plugins: [
		new webpack.DllReferencePlugin({
			context: ".",
			manifest: require("./js/vendor-manifest.json"), // eslint-disable-line
		}),
	],
};
```

### webpack.vendor.config.js

``` javascript
var path = require("path");
var webpack = require("../../");

module.exports = {
	context: __dirname,

	entry: {
		// these entries can also point to dependencies,
		// which can significantly boost build time in the app bundle
		vendor: ["./example-vendor"],
	},
	output: {
		filename: "vendor.bundle.js",
		path: path.resolve(__dirname, "./js"),
		library: "vendor_lib",
	},
	plugins: [
		new webpack.DllPlugin({
			name: "vendor_lib",
			path: path.resolve(__dirname, "./js/vendor-manifest.json"),
		}),
	],
};
```


# Source

# example-vendor.js

used by `example-app.js`

``` javascript
var square = require("./example-vendor.js");

console.log(square(7));
```

# example-app.js

uses `example-vendor.js`

``` javascript
var square = require("./example-vendor.js");

console.log(square(7));
```

# html

uses `example-vendor.js`, then `example-app.js`

``` html
<html>
	<head></head>
	<body>
		<script src="js/vendor.bundle.js" charset="utf-8"></script>
		<script src="js/app.bundle.js" charset="utf-8"></script>
	</body>
</html>
```


# output

## js/app.bundle.js

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
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
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
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!************************!*\
  !*** ./example-app.js ***!
  \************************/
/***/ (function(module, exports, __webpack_require__) {

var square = __webpack_require__(/*! ./example-vendor.js */ 1);

console.log(square(7));


/***/ }),
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!*******************************************************************!*\
  !*** delegated ./example-vendor.js from dll-reference vendor_lib ***!
  \*******************************************************************/
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(2))(0);

/***/ }),
/* 2 */
/* unknown exports provided */
/*!*****************************!*\
  !*** external "vendor_lib" ***!
  \*****************************/
/***/ (function(module, exports) {

module.exports = vendor_lib;

/***/ }),
/* 3 */
/* unknown exports provided */
/* all exports used */
/*!***************************!*\
  !*** multi ./example-app ***!
  \***************************/
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./example-app */0);


/***/ })
/******/ ]);
```

## js/vendor.bundle.js

``` javascript
var vendor_lib =
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
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
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
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!***************************!*\
  !*** ./example-vendor.js ***!
  \***************************/
/***/ (function(module, exports) {

function square(n) {
	return n * n;
}

module.exports = square;


/***/ }),
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!******************!*\
  !*** dll vendor ***!
  \******************/
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__;

/***/ })
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 88507ec9bb3c326dd599564618e3ec990bda91e4
Version: webpack 2.4.1
Child
    Hash: 88507ec9bb3c326dd599
               Asset     Size  Chunks             Chunk Names
    vendor.bundle.js  3.11 kB       0  [emitted]  vendor
    Entrypoint vendor = vendor.bundle.js
    chunk    {0} vendor.bundle.js (vendor) 76 bytes [entry] [rendered]
        > vendor [1] dll vendor 
        [0] ./example-vendor.js 64 bytes {0} [built]
            single entry ./example-vendor [1] dll vendor vendor:0
        [1] dll vendor 12 bytes {0} [built]
Child
    Hash: 564618e3ec990bda91e4
            Asset     Size  Chunks             Chunk Names
    app.bundle.js  3.79 kB       0  [emitted]  app
    Entrypoint app = app.bundle.js
    chunk    {0} app.bundle.js (app) 182 bytes [entry] [rendered]
        > app [3] multi ./example-app 
        [0] ./example-app.js 70 bytes {0} [built]
            single entry ./example-app [3] multi ./example-app app:100000
        [1] delegated ./example-vendor.js from dll-reference vendor_lib 42 bytes {0} [not cacheable] [built]
            cjs require ./example-vendor.js [0] ./example-app.js 1:13-43
        [3] multi ./example-app 28 bytes {0} [built]
         + 1 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: 88507ec9bb3c326dd599564618e3ec990bda91e4
Version: webpack 2.4.1
Child
    Hash: 88507ec9bb3c326dd599
               Asset       Size  Chunks             Chunk Names
    vendor.bundle.js  594 bytes       0  [emitted]  vendor
    Entrypoint vendor = vendor.bundle.js
    chunk    {0} vendor.bundle.js (vendor) 76 bytes [entry] [rendered]
        > vendor [1] dll vendor 
        [0] ./example-vendor.js 64 bytes {0} [built]
            single entry ./example-vendor [1] dll vendor vendor:0
        [1] dll vendor 12 bytes {0} [built]
Child
    Hash: 564618e3ec990bda91e4
            Asset       Size  Chunks             Chunk Names
    app.bundle.js  641 bytes       0  [emitted]  app
    Entrypoint app = app.bundle.js
    chunk    {0} app.bundle.js (app) 182 bytes [entry] [rendered]
        > app [3] multi ./example-app 
        [0] ./example-app.js 70 bytes {0} [built]
            single entry ./example-app [3] multi ./example-app app:100000
        [1] delegated ./example-vendor.js from dll-reference vendor_lib 42 bytes {0} [not cacheable] [built]
            cjs require ./example-vendor.js [0] ./example-app.js 1:13-43
        [3] multi ./example-app 28 bytes {0} [built]
         + 1 hidden modules
```

<!-- @TODO:
  - [ ] examples/dll-mode-and-context
  - [ ] examples/dll-multiple
  - [ ] examples/dll-dependencies
-->
