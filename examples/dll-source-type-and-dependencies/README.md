# Dll sourceType and dependencies

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

Uses `libraryTarget` + `sourceType` `"commonjs2"` to create a vendor bundle, and a dependency bundle, on nodejs. Has a single DllPlugin, with multiple DllReferencePlugins.

# Configs

### webpack.app.config.js

``` javascript
var webpack = require("../../");
var path = require("path");

module.exports = {
	target: "node",
	entry: {
		app: ["./example-app"],
	},
	output: {
		filename: "app.bundle.js",
		path: path.resolve(__dirname, "./js"),
		libraryTarget: "commonjs2",
	},
	plugins: [
		new webpack.DllReferencePlugin({
			context: ".",
			manifest: require("./js/vendor-manifest.json"), // eslint-disable-line
		}),
		new webpack.DllReferencePlugin({
			context: ".",
			manifest: require("./js/dependencies-manifest.json"), // eslint-disable-line
		})
	]
};
```

### webpack.vendor.config.js

``` javascript
var webpack = require("webpack");
var path = require("path");

module.exports = {
	target: "node",
	entry: {
		dependencies: ["lodash"],
		vendor: ["./example-vendor"],
	},
	output: {
		filename: "[name].bundle.js",
		path: path.resolve(__dirname, "./js"),
		library: "[name]_lib",
		libraryTarget: "commonjs2",
	},
	plugins: [
		new webpack.DllPlugin({
			context: ".",

      // The name of the global variable which the library's
      // require function has been assigned to. This must match the
      // output.library option above
			name: "[name]_dll_lib",

      // The path to the manifest file which maps between
      // modules included in a bundle and the internal IDs
      // within that bundle
			path: "./js/[name]-manifest.json",

			// must match output libraryTarget
			sourceType: "commonjs2"
		})
	]
};
```


# Source

## example-vendor.js

used by `example-app.js`

``` javascript
module.exports = require("es6-promise-polyfill");
```

## example-app.js

uses `example-vendor.js`

``` javascript
var _ = require("lodash");
var benchmark = require("./example-vendor");

console.log("lodash", _);
console.log("benchmark", benchmark);
```


# Output


## js/app.bundle.js

``` javascript
module.exports =
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
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
```

</details>

``` js
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!************************!*\
  !*** ./example-app.js ***!
  \************************/
/***/ (function(module, exports, __webpack_require__) {

var _ = __webpack_require__(/*! lodash */ 2);
var benchmark = __webpack_require__(/*! ./example-vendor */ 1);

console.log("lodash", _);
console.log("benchmark", benchmark);


/***/ }),
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!***********************************************************************!*\
  !*** delegated ./example-vendor.js from dll-reference vendor_dll_lib ***!
  \***********************************************************************/
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(4))(0)

/***/ }),
/* 2 */
/* unknown exports provided */
/* all exports used */
/*!*********************************************************************************************!*\
  !*** delegated ../../node_modules/lodash/lodash.js from dll-reference dependencies_dll_lib ***!
  \*********************************************************************************************/
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(3))(1)

/***/ }),
/* 3 */
/* unknown exports provided */
/*!***************************************!*\
  !*** external "dependencies_dll_lib" ***!
  \***************************************/
/***/ (function(module, exports) {

module.exports = dependencies_dll_lib;

/***/ }),
/* 4 */
/* unknown exports provided */
/*!*********************************!*\
  !*** external "vendor_dll_lib" ***!
  \*********************************/
/***/ (function(module, exports) {

module.exports = vendor_dll_lib;

/***/ }),
/* 5 */
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
_omitted since it contains the large dependency source code_


## js/vendor-manifest.json

``` javascript
{
  "name": "vendor_dll_lib",
  "content": {
    "./example-vendor.js": {
      "id": 0,
      "meta": {}
    },
    "../../node_modules/es6-promise-polyfill/promise.js": {
      "id": 3,
      "meta": {}
    }
  }
}
```


## js/dependencies.bundle.js

_omitted since it contains the large dependency source code_


## js/dependencies-manifest.json

``` javascript
{
  "name": "dependencies_dll_lib",
  "content": {
    "../../node_modules/lodash/lodash.js": {
      "id": 1,
      "meta": {}
    },
    "../../buildin/module.js": {
      "id": 2,
      "meta": {}
    }
  }
}
```

# Info

## Uncompressed

```
Hash: 828665434b90ead096c2e43b13aa7ae01256e2cc
Version: webpack 2.4.1
Child
    Hash: 828665434b90ead096c2
                     Asset     Size  Chunks                    Chunk Names
          vendor.bundle.js  10.8 kB       0  [emitted]         vendor
    dependencies.bundle.js   544 kB       1  [emitted]  [big]  dependencies
    Entrypoint dependencies [big] = dependencies.bundle.js
    Entrypoint vendor = vendor.bundle.js
    chunk    {0} vendor.bundle.js (vendor) 7.17 kB [entry] [rendered]
        > vendor [5] dll vendor 
        [0] ./example-vendor.js 50 bytes {0} [built]
            single entry ./example-vendor [5] dll vendor vendor:0
        [3] (webpack)/~/es6-promise-polyfill/promise.js 7.11 kB {0} [built]
            cjs require es6-promise-polyfill [0] ./example-vendor.js 1:17-48
        [5] dll vendor 12 bytes {0} [built]
    chunk    {1} dependencies.bundle.js (dependencies) 540 kB [entry] [rendered]
        > dependencies [4] dll dependencies 
        [1] (webpack)/~/lodash/lodash.js 540 kB {1} [built]
            single entry lodash [4] dll dependencies dependencies:0
        [2] (webpack)/buildin/module.js 495 bytes {1} [built]
            cjs require module [1] (webpack)/~/lodash/lodash.js 1:0-36
        [4] dll dependencies 12 bytes {1} [built]
Child
    Hash: e43b13aa7ae01256e2cc
            Asset     Size  Chunks             Chunk Names
    app.bundle.js  4.65 kB       0  [emitted]  app
    Entrypoint app = app.bundle.js
    chunk    {0} app.bundle.js (app) 332 bytes [entry] [rendered]
        > app [5] multi ./example-app 
        [0] ./example-app.js 136 bytes {0} [built]
            single entry ./example-app [5] multi ./example-app app:100000
        [1] delegated ./example-vendor.js from dll-reference vendor_dll_lib 42 bytes {0} [not cacheable] [built]
            cjs require ./example-vendor [0] ./example-app.js 2:16-43
        [2] delegated ../../node_modules/lodash/lodash.js from dll-reference dependencies_dll_lib 42 bytes {0} [not cacheable] [built]
            cjs require lodash [0] ./example-app.js 1:8-25
        [5] multi ./example-app 28 bytes {0} [built]
         + 2 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: 828665434b90ead096c2e43b13aa7ae01256e2cc
Version: webpack 2.4.1
Child
    Hash: 828665434b90ead096c2
                     Asset     Size  Chunks             Chunk Names
          vendor.bundle.js   3.4 kB       0  [emitted]  vendor
    dependencies.bundle.js  71.8 kB       1  [emitted]  dependencies
    Entrypoint dependencies = dependencies.bundle.js
    Entrypoint vendor = vendor.bundle.js
    chunk    {0} vendor.bundle.js (vendor) 7.17 kB [entry] [rendered]
        > vendor [5] dll vendor 
        [0] ./example-vendor.js 50 bytes {0} [built]
            single entry ./example-vendor [5] dll vendor vendor:0
        [3] (webpack)/~/es6-promise-polyfill/promise.js 7.11 kB {0} [built]
            cjs require es6-promise-polyfill [0] ./example-vendor.js 1:17-48
        [5] dll vendor 12 bytes {0} [built]
    chunk    {1} dependencies.bundle.js (dependencies) 540 kB [entry] [rendered]
        > dependencies [4] dll dependencies 
        [1] (webpack)/~/lodash/lodash.js 540 kB {1} [built]
            single entry lodash [4] dll dependencies dependencies:0
        [2] (webpack)/buildin/module.js 495 bytes {1} [built]
            cjs require module [1] (webpack)/~/lodash/lodash.js 1:0-36
        [4] dll dependencies 12 bytes {1} [built]
Child
    Hash: e43b13aa7ae01256e2cc
            Asset       Size  Chunks             Chunk Names
    app.bundle.js  787 bytes       0  [emitted]  app
    Entrypoint app = app.bundle.js
    chunk    {0} app.bundle.js (app) 332 bytes [entry] [rendered]
        > app [5] multi ./example-app 
        [0] ./example-app.js 136 bytes {0} [built]
            single entry ./example-app [5] multi ./example-app app:100000
        [1] delegated ./example-vendor.js from dll-reference vendor_dll_lib 42 bytes {0} [not cacheable] [built]
            cjs require ./example-vendor [0] ./example-app.js 2:16-43
        [2] delegated ../../node_modules/lodash/lodash.js from dll-reference dependencies_dll_lib 42 bytes {0} [not cacheable] [built]
            cjs require lodash [0] ./example-app.js 1:8-25
        [5] multi ./example-app 28 bytes {0} [built]
         + 2 hidden modules
```
