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
			manifest: require("../dll/js/beta-manifest.json"),
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

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

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
/******/ 	return __webpack_require__(__webpack_require__.s = 8);
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ([
/* 0 */
/* unknown exports provided */
/*!*********************************************!*\
  !*** external "alpha_282e8826843b2bb4eeb1" ***!
  \*********************************************/
/***/ function(module, exports) {

module.exports = alpha_282e8826843b2bb4eeb1;

/***/ },
/* 1 */
/* unknown exports provided */
/*!********************************************!*\
  !*** external "beta_282e8826843b2bb4eeb1" ***!
  \********************************************/
/***/ function(module, exports) {

module.exports = beta_282e8826843b2bb4eeb1;

/***/ },
/* 2 */
/* unknown exports provided */
/* all exports used */
/*!**********************************************************************!*\
  !*** delegated ./a.js from dll-reference alpha_282e8826843b2bb4eeb1 ***!
  \**********************************************************************/
/***/ function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(0);

/***/ },
/* 3 */
/* unknown exports provided */
/* all exports used */
/*!**************************************************************************!*\
  !*** delegated ./alpha.js from dll-reference alpha_282e8826843b2bb4eeb1 ***!
  \**************************************************************************/
/***/ function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(1);

/***/ },
/* 4 */
/* unknown exports provided */
/* all exports used */
/*!*********************************************************************!*\
  !*** delegated ./b.js from dll-reference beta_282e8826843b2bb4eeb1 ***!
  \*********************************************************************/
/***/ function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(1))(2);

/***/ },
/* 5 */
/* unknown exports provided */
/* all exports used */
/*!************************************************************************!*\
  !*** delegated ./beta.js from dll-reference beta_282e8826843b2bb4eeb1 ***!
  \************************************************************************/
/***/ function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(1))(3);

/***/ },
/* 6 */
/* unknown exports provided */
/* all exports used */
/*!**********************************************************************!*\
  !*** delegated ./c.jsx from dll-reference beta_282e8826843b2bb4eeb1 ***!
  \**********************************************************************/
/***/ function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(1))(4);

/***/ },
/* 7 */
/* unknown exports provided */
/* all exports used */
/*!*****************************************************************************************!*\
  !*** delegated ../node_modules/module.js from dll-reference alpha_282e8826843b2bb4eeb1 ***!
  \*****************************************************************************************/
/***/ function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(5);

/***/ },
/* 8 */
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
console.log(__webpack_require__(/*! beta/c */ 6));

console.log(__webpack_require__(/*! module */ 7));


/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 98591c1a714273e72054
Version: webpack 2.2.0-rc.2
    Asset     Size  Chunks             Chunk Names
output.js  6.03 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 549 bytes [entry] [rendered]
    > main [8] ./example.js 
    [2] delegated ./a.js from dll-reference alpha_282e8826843b2bb4eeb1 42 bytes {0} [not cacheable] [built]
        cjs require ../dll/a [8] ./example.js 2:12-31
    [3] delegated ./alpha.js from dll-reference alpha_282e8826843b2bb4eeb1 42 bytes {0} [not cacheable] [built]
        cjs require ../dll/alpha [8] ./example.js 1:12-35
    [4] delegated ./b.js from dll-reference beta_282e8826843b2bb4eeb1 42 bytes {0} [not cacheable] [built]
        cjs require beta/b [8] ./example.js 5:12-29
    [5] delegated ./beta.js from dll-reference beta_282e8826843b2bb4eeb1 42 bytes {0} [not cacheable] [built]
        cjs require beta/beta [8] ./example.js 4:12-32
    [6] delegated ./c.jsx from dll-reference beta_282e8826843b2bb4eeb1 42 bytes {0} [not cacheable] [built]
        cjs require beta/c [8] ./example.js 6:12-29
    [7] delegated ../node_modules/module.js from dll-reference alpha_282e8826843b2bb4eeb1 42 bytes {0} [not cacheable] [built]
        cjs require module [8] ./example.js 8:12-29
    [8] ./example.js 213 bytes {0} [built]
     + 2 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: 98591c1a714273e72054
Version: webpack 2.2.0-rc.2
    Asset       Size  Chunks             Chunk Names
output.js  937 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 549 bytes [entry] [rendered]
    > main [8] ./example.js 
    [2] delegated ./a.js from dll-reference alpha_282e8826843b2bb4eeb1 42 bytes {0} [not cacheable] [built]
        cjs require ../dll/a [8] ./example.js 2:12-31
    [3] delegated ./alpha.js from dll-reference alpha_282e8826843b2bb4eeb1 42 bytes {0} [not cacheable] [built]
        cjs require ../dll/alpha [8] ./example.js 1:12-35
    [4] delegated ./b.js from dll-reference beta_282e8826843b2bb4eeb1 42 bytes {0} [not cacheable] [built]
        cjs require beta/b [8] ./example.js 5:12-29
    [5] delegated ./beta.js from dll-reference beta_282e8826843b2bb4eeb1 42 bytes {0} [not cacheable] [built]
        cjs require beta/beta [8] ./example.js 4:12-32
    [6] delegated ./c.jsx from dll-reference beta_282e8826843b2bb4eeb1 42 bytes {0} [not cacheable] [built]
        cjs require beta/c [8] ./example.js 6:12-29
    [7] delegated ../node_modules/module.js from dll-reference alpha_282e8826843b2bb4eeb1 42 bytes {0} [not cacheable] [built]
        cjs require module [8] ./example.js 8:12-29
    [8] ./example.js 213 bytes {0} [built]
     + 2 hidden modules
```