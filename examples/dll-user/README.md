# DllUser

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

This is the _user_ bundle, which uses the manifest from [dll-reference example](https://github.com/webpack/webpack/tree/master/examples/dll)

# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = {
	// mode: "development || "production",
	plugins: [
		new webpack.DllReferencePlugin({
			context: path.join(__dirname, "..", "dll"),
			manifest: require("../dll/dist/alpha-manifest.json") // eslint-disable-line
		}),
		new webpack.DllReferencePlugin({
			scope: "beta",
			manifest: require("../dll/dist/beta-manifest.json"), // eslint-disable-line
			extensions: [".js", ".jsx"]
		})
	]
};
```

# example.js

``` javascript
console.log(require("../dll/alpha"));
console.log(require("../dll/a"));

console.log(require("beta/beta"));
console.log(require("beta/b"));
console.log(require("beta/c"));

console.log(require("module"));
```

# dist/output.js

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
/******/ 	__webpack_require__.p = "dist/";
/******/
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
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

console.log(__webpack_require__(/*! ../dll/alpha */ 1));
console.log(__webpack_require__(/*! ../dll/a */ 3));

console.log(__webpack_require__(/*! beta/beta */ 4));
console.log(__webpack_require__(/*! beta/b */ 6));
console.log(__webpack_require__(/*! beta/c */ 7));

console.log(__webpack_require__(/*! module */ 8));


/***/ }),
/* 1 */
/*!**************************************************************************!*\
  !*** delegated ./alpha.js from dll-reference alpha_9acca21e0d34e518784e ***!
  \**************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference alpha_9acca21e0d34e518784e */ 2))(1);

/***/ }),
/* 2 */
/*!*********************************************!*\
  !*** external "alpha_9acca21e0d34e518784e" ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = alpha_9acca21e0d34e518784e;

/***/ }),
/* 3 */
/*!**********************************************************************!*\
  !*** delegated ./a.js from dll-reference alpha_9acca21e0d34e518784e ***!
  \**********************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference alpha_9acca21e0d34e518784e */ 2))(2);

/***/ }),
/* 4 */
/*!************************************************************************!*\
  !*** delegated ./beta.js from dll-reference beta_9acca21e0d34e518784e ***!
  \************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference beta_9acca21e0d34e518784e */ 5))(5);

/***/ }),
/* 5 */
/*!********************************************!*\
  !*** external "beta_9acca21e0d34e518784e" ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = beta_9acca21e0d34e518784e;

/***/ }),
/* 6 */
/*!*********************************************************************!*\
  !*** delegated ./b.js from dll-reference beta_9acca21e0d34e518784e ***!
  \*********************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference beta_9acca21e0d34e518784e */ 5))(6);

/***/ }),
/* 7 */
/*!**********************************************************************!*\
  !*** delegated ./c.jsx from dll-reference beta_9acca21e0d34e518784e ***!
  \**********************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference beta_9acca21e0d34e518784e */ 5))(7);

/***/ }),
/* 8 */
/*!*****************************************************************************************!*\
  !*** delegated ../node_modules/module.js from dll-reference alpha_9acca21e0d34e518784e ***!
  \*****************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference alpha_9acca21e0d34e518784e */ 2))(3);

/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
    Asset      Size  Chunks             Chunk Names
output.js  6.19 KiB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 549 bytes [entry] [rendered]
    > .\example.js main
 [0] ./example.js 213 bytes {0} [built]
     single entry .\example.js  main
 [1] delegated ./alpha.js from dll-reference alpha_9acca21e0d34e518784e 42 bytes {0} [built]
     cjs require ../dll/alpha [0] ./example.js 1:12-35
 [2] external "alpha_9acca21e0d34e518784e" 42 bytes {0} [built]
     delegated source dll-reference alpha_9acca21e0d34e518784e [1] delegated ./alpha.js from dll-reference alpha_9acca21e0d34e518784e
     delegated source dll-reference alpha_9acca21e0d34e518784e [3] delegated ./a.js from dll-reference alpha_9acca21e0d34e518784e
     delegated source dll-reference alpha_9acca21e0d34e518784e [8] delegated ../node_modules/module.js from dll-reference alpha_9acca21e0d34e518784e
 [3] delegated ./a.js from dll-reference alpha_9acca21e0d34e518784e 42 bytes {0} [built]
     cjs require ../dll/a [0] ./example.js 2:12-31
 [4] delegated ./beta.js from dll-reference beta_9acca21e0d34e518784e 42 bytes {0} [built]
     cjs require beta/beta [0] ./example.js 4:12-32
 [5] external "beta_9acca21e0d34e518784e" 42 bytes {0} [built]
     delegated source dll-reference beta_9acca21e0d34e518784e [4] delegated ./beta.js from dll-reference beta_9acca21e0d34e518784e
     delegated source dll-reference beta_9acca21e0d34e518784e [6] delegated ./b.js from dll-reference beta_9acca21e0d34e518784e
     delegated source dll-reference beta_9acca21e0d34e518784e [7] delegated ./c.jsx from dll-reference beta_9acca21e0d34e518784e
 [6] delegated ./b.js from dll-reference beta_9acca21e0d34e518784e 42 bytes {0} [built]
     cjs require beta/b [0] ./example.js 5:12-29
 [7] delegated ./c.jsx from dll-reference beta_9acca21e0d34e518784e 42 bytes {0} [built]
     cjs require beta/c [0] ./example.js 6:12-29
 [8] delegated ../node_modules/module.js from dll-reference alpha_9acca21e0d34e518784e 42 bytes {0} [built]
     cjs require module [0] ./example.js 8:12-29
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
    Asset       Size  Chunks             Chunk Names
output.js  972 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 549 bytes [entry] [rendered]
    > .\example.js main
 [0] external "beta_9acca21e0d34e518784e" 42 bytes {0} [built]
     delegated source dll-reference beta_9acca21e0d34e518784e [3] delegated ./c.jsx from dll-reference beta_9acca21e0d34e518784e
     delegated source dll-reference beta_9acca21e0d34e518784e [4] delegated ./b.js from dll-reference beta_9acca21e0d34e518784e
     delegated source dll-reference beta_9acca21e0d34e518784e [5] delegated ./beta.js from dll-reference beta_9acca21e0d34e518784e
 [1] external "alpha_9acca21e0d34e518784e" 42 bytes {0} [built]
     delegated source dll-reference alpha_9acca21e0d34e518784e [2] delegated ../node_modules/module.js from dll-reference alpha_9acca21e0d34e518784e
     delegated source dll-reference alpha_9acca21e0d34e518784e [6] delegated ./a.js from dll-reference alpha_9acca21e0d34e518784e
     delegated source dll-reference alpha_9acca21e0d34e518784e [7] delegated ./alpha.js from dll-reference alpha_9acca21e0d34e518784e
 [2] delegated ../node_modules/module.js from dll-reference alpha_9acca21e0d34e518784e 42 bytes {0} [built]
     cjs require module [8] ./example.js 8:12-29
 [3] delegated ./c.jsx from dll-reference beta_9acca21e0d34e518784e 42 bytes {0} [built]
     cjs require beta/c [8] ./example.js 6:12-29
 [4] delegated ./b.js from dll-reference beta_9acca21e0d34e518784e 42 bytes {0} [built]
     cjs require beta/b [8] ./example.js 5:12-29
 [5] delegated ./beta.js from dll-reference beta_9acca21e0d34e518784e 42 bytes {0} [built]
     cjs require beta/beta [8] ./example.js 4:12-32
 [6] delegated ./a.js from dll-reference alpha_9acca21e0d34e518784e 42 bytes {0} [built]
     cjs require ../dll/a [8] ./example.js 2:12-31
 [7] delegated ./alpha.js from dll-reference alpha_9acca21e0d34e518784e 42 bytes {0} [built]
     cjs require ../dll/alpha [8] ./example.js 1:12-35
 [8] ./example.js 213 bytes {0} [built]
     single entry .\example.js  main
```
