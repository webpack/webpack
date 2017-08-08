# DllUser

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

This is the _user_ bundle, which uses the manifest from [dll-reference example](https://github.com/webpack/webpack/tree/master/examples/dll)

# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = {
	plugins: [
		new webpack.DllReferencePlugin({
			context: path.join(__dirname, "..", "dll"),
			manifest: require("../dll/js/alpha-manifest.json") // eslint-disable-line
		}),
		new webpack.DllReferencePlugin({
			scope: "beta",
			manifest: require("../dll/js/beta-manifest.json"), // eslint-disable-line
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

# js/output.js

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
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!*********************************************!*\
  !*** external "alpha_457b6718a3ff9f8c2d77" ***!
  \*********************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = alpha_457b6718a3ff9f8c2d77;

/***/ }),
/* 1 */
/*!********************************************!*\
  !*** external "beta_457b6718a3ff9f8c2d77" ***!
  \********************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = beta_457b6718a3ff9f8c2d77;

/***/ }),
/* 2 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

console.log(__webpack_require__(/*! ../dll/alpha */ 3));
console.log(__webpack_require__(/*! ../dll/a */ 4));

console.log(__webpack_require__(/*! beta/beta */ 5));
console.log(__webpack_require__(/*! beta/b */ 6));
console.log(__webpack_require__(/*! beta/c */ 7));

console.log(__webpack_require__(/*! module */ 8));


/***/ }),
/* 3 */
/*!**************************************************************************!*\
  !*** delegated ./alpha.js from dll-reference alpha_457b6718a3ff9f8c2d77 ***!
  \**************************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(1);

/***/ }),
/* 4 */
/*!**********************************************************************!*\
  !*** delegated ./a.js from dll-reference alpha_457b6718a3ff9f8c2d77 ***!
  \**********************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(2);

/***/ }),
/* 5 */
/*!************************************************************************!*\
  !*** delegated ./beta.js from dll-reference beta_457b6718a3ff9f8c2d77 ***!
  \************************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(1))(5);

/***/ }),
/* 6 */
/*!*********************************************************************!*\
  !*** delegated ./b.js from dll-reference beta_457b6718a3ff9f8c2d77 ***!
  \*********************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(1))(6);

/***/ }),
/* 7 */
/*!**********************************************************************!*\
  !*** delegated ./c.jsx from dll-reference beta_457b6718a3ff9f8c2d77 ***!
  \**********************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(1))(7);

/***/ }),
/* 8 */
/*!*****************************************************************************************!*\
  !*** delegated ../node_modules/module.js from dll-reference alpha_457b6718a3ff9f8c2d77 ***!
  \*****************************************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(3);

/***/ })
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 60ca229a9df08630fded
Version: webpack 3.5.1
    Asset     Size  Chunks             Chunk Names
output.js  6.06 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 549 bytes [entry] [rendered]
    > main [2] ./example.js 
    [2] ./example.js 213 bytes {0} [built]
    [3] delegated ./alpha.js from dll-reference alpha_457b6718a3ff9f8c2d77 42 bytes {0} [built]
        cjs require ../dll/alpha [2] ./example.js 1:12-35
    [4] delegated ./a.js from dll-reference alpha_457b6718a3ff9f8c2d77 42 bytes {0} [built]
        cjs require ../dll/a [2] ./example.js 2:12-31
    [5] delegated ./beta.js from dll-reference beta_457b6718a3ff9f8c2d77 42 bytes {0} [built]
        cjs require beta/beta [2] ./example.js 4:12-32
    [6] delegated ./b.js from dll-reference beta_457b6718a3ff9f8c2d77 42 bytes {0} [built]
        cjs require beta/b [2] ./example.js 5:12-29
    [7] delegated ./c.jsx from dll-reference beta_457b6718a3ff9f8c2d77 42 bytes {0} [built]
        cjs require beta/c [2] ./example.js 6:12-29
    [8] delegated ../node_modules/module.js from dll-reference alpha_457b6718a3ff9f8c2d77 42 bytes {0} [built]
        cjs require module [2] ./example.js 8:12-29
     + 2 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: 60ca229a9df08630fded
Version: webpack 3.5.1
    Asset       Size  Chunks             Chunk Names
output.js  904 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 549 bytes [entry] [rendered]
    > main [2] ./example.js 
    [2] ./example.js 213 bytes {0} [built]
    [3] delegated ./alpha.js from dll-reference alpha_457b6718a3ff9f8c2d77 42 bytes {0} [built]
        cjs require ../dll/alpha [2] ./example.js 1:12-35
    [4] delegated ./a.js from dll-reference alpha_457b6718a3ff9f8c2d77 42 bytes {0} [built]
        cjs require ../dll/a [2] ./example.js 2:12-31
    [5] delegated ./beta.js from dll-reference beta_457b6718a3ff9f8c2d77 42 bytes {0} [built]
        cjs require beta/beta [2] ./example.js 4:12-32
    [6] delegated ./b.js from dll-reference beta_457b6718a3ff9f8c2d77 42 bytes {0} [built]
        cjs require beta/b [2] ./example.js 5:12-29
    [7] delegated ./c.jsx from dll-reference beta_457b6718a3ff9f8c2d77 42 bytes {0} [built]
        cjs require beta/c [2] ./example.js 6:12-29
    [8] delegated ../node_modules/module.js from dll-reference alpha_457b6718a3ff9f8c2d77 42 bytes {0} [built]
        cjs require module [2] ./example.js 8:12-29
     + 2 hidden modules
```
