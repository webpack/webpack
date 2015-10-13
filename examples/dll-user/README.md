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
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	console.log(__webpack_require__(/*! ../dll/alpha */ 1));
	console.log(__webpack_require__(/*! ../dll/a */ 3));

	console.log(__webpack_require__(/*! beta/beta */ 4));
	console.log(__webpack_require__(/*! beta/b */ 6));

	console.log(__webpack_require__(/*! module */ 7));


/***/ },
/* 1 */
/*!**************************************************************************!*\
  !*** delegated ./alpha.js from dll-reference alpha_fdf65b7c8f44aa643c94 ***!
  \**************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(2))(1);

/***/ },
/* 2 */
/*!*********************************************!*\
  !*** external "alpha_fdf65b7c8f44aa643c94" ***!
  \*********************************************/
/***/ function(module, exports) {

	module.exports = alpha_fdf65b7c8f44aa643c94;

/***/ },
/* 3 */
/*!**********************************************************************!*\
  !*** delegated ./a.js from dll-reference alpha_fdf65b7c8f44aa643c94 ***!
  \**********************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(2))(2);

/***/ },
/* 4 */
/*!************************************************************************!*\
  !*** delegated ./beta.js from dll-reference beta_fdf65b7c8f44aa643c94 ***!
  \************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(5))(4);

/***/ },
/* 5 */
/*!********************************************!*\
  !*** external "beta_fdf65b7c8f44aa643c94" ***!
  \********************************************/
/***/ function(module, exports) {

	module.exports = beta_fdf65b7c8f44aa643c94;

/***/ },
/* 6 */
/*!*********************************************************************!*\
  !*** delegated ./b.js from dll-reference beta_fdf65b7c8f44aa643c94 ***!
  \*********************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(5))(5);

/***/ },
/* 7 */
/*!*****************************************************************************************!*\
  !*** delegated ../node_modules/module.js from dll-reference alpha_fdf65b7c8f44aa643c94 ***!
  \*****************************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(2))(3);

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 1ec5dd5375620450fa42
Version: webpack 1.12.2
Time: 126ms
    Asset     Size  Chunks             Chunk Names
output.js  4.08 kB       0  [emitted]  main
chunk    {0} output.js (main) 474 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 180 bytes {0} [built]
     + 7 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: 027c2207d2b3e0dfd65e
Version: webpack 1.12.2
Time: 268ms
    Asset       Size  Chunks             Chunk Names
output.js  590 bytes       0  [emitted]  main
chunk    {0} output.js (main) 474 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 180 bytes {0} [built]
     + 7 hidden modules
```