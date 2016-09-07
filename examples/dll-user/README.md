# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = {
	plugins: [
		new webpack.DllReferencePlugin({
			context: path.join(__dirname, "..", "dll"),
			manifest: require("../dll/js/alpha-manifest.json")
		}),
		new webpack.DllReferencePlugin({
			scope: "beta",
			manifest: require("../dll/js/beta-manifest.json")
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

console.log(require("module"));
```

# js/output.js

<details><summary>`/******/ (function(modules) { /* webpackBootstrap */ })`</summary>
``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmory exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		Object.defineProperty(exports, name, {
/******/ 			configurable: false,
/******/ 			enumerable: true,
/******/ 			get: getter
/******/ 		});
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 7);
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!*********************************************!*\
  !*** external "alpha_bddd20dd00f7b888c2b8" ***!
  \*********************************************/
/***/ function(module, exports) {

module.exports = alpha_bddd20dd00f7b888c2b8;

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!********************************************!*\
  !*** external "beta_bddd20dd00f7b888c2b8" ***!
  \********************************************/
/***/ function(module, exports) {

module.exports = beta_bddd20dd00f7b888c2b8;

/***/ },
/* 2 */
/* unknown exports provided */
/* all exports used */
/*!**********************************************************************!*\
  !*** delegated ./a.js from dll-reference alpha_bddd20dd00f7b888c2b8 ***!
  \**********************************************************************/
/***/ function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(0);

/***/ },
/* 3 */
/* unknown exports provided */
/* all exports used */
/*!**************************************************************************!*\
  !*** delegated ./alpha.js from dll-reference alpha_bddd20dd00f7b888c2b8 ***!
  \**************************************************************************/
/***/ function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(1);

/***/ },
/* 4 */
/* unknown exports provided */
/* all exports used */
/*!*********************************************************************!*\
  !*** delegated ./b.js from dll-reference beta_bddd20dd00f7b888c2b8 ***!
  \*********************************************************************/
/***/ function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(1))(2);

/***/ },
/* 5 */
/* unknown exports provided */
/* all exports used */
/*!************************************************************************!*\
  !*** delegated ./beta.js from dll-reference beta_bddd20dd00f7b888c2b8 ***!
  \************************************************************************/
/***/ function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(1))(3);

/***/ },
/* 6 */
/* unknown exports provided */
/* all exports used */
/*!*****************************************************************************************!*\
  !*** delegated ../node_modules/module.js from dll-reference alpha_bddd20dd00f7b888c2b8 ***!
  \*****************************************************************************************/
/***/ function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(4);

/***/ },
/* 7 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

console.log(__webpack_require__(/*! ../dll/alpha */ 3));
console.log(__webpack_require__(/*! ../dll/a */ 2));

console.log(__webpack_require__(/*! beta/beta */ 5));
console.log(__webpack_require__(/*! beta/b */ 4));

console.log(__webpack_require__(/*! module */ 6));


/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 8a4e806f81e54d3bc321
Version: webpack 2.1.0-beta.22
Time: 147ms
    Asset     Size  Chunks             Chunk Names
output.js  5.54 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 474 bytes [entry] [rendered]
    > main [7] ./example.js 
    [7] ./example.js 180 bytes {0} [built]
     + 7 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: 8a4e806f81e54d3bc321
Version: webpack 2.1.0-beta.22
Time: 277ms
    Asset       Size  Chunks             Chunk Names
output.js  877 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 474 bytes [entry] [rendered]
    > main [7] ./example.js 
    [7] ./example.js 180 bytes {0} [built]
     + 7 hidden modules
```