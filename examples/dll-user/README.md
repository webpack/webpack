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
/******/ 	return __webpack_require__(__webpack_require__.s = 8);
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
  !*** external "alpha_282e8826843b2bb4eeb1" ***!
  \*********************************************/
/***/ function(module, exports) {

module.exports = alpha_282e8826843b2bb4eeb1;

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
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
Hash: c912c9e1b4764365c16e
Version: webpack 2.1.0-beta.22
Time: 76ms
    Asset  Size  Chunks             Chunk Names
output.js  6 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 549 bytes [entry] [rendered]
    > main [8] ./example.js 
    [8] ./example.js 213 bytes {0} [built]
     + 8 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: c912c9e1b4764365c16e
Version: webpack 2.1.0-beta.22
Time: 145ms
    Asset       Size  Chunks             Chunk Names
output.js  927 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 549 bytes [entry] [rendered]
    > main [8] ./example.js 
    [8] ./example.js 213 bytes {0} [built]
     + 8 hidden modules
```