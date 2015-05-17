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


/***/ },
/* 1 */
/*!**************************************************************************!*\
  !*** delegated ./alpha.js from dll-reference alpha_fda802f3c408a66ef744 ***!
  \**************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(2))(1);

/***/ },
/* 2 */
/*!*********************************************!*\
  !*** external "alpha_fda802f3c408a66ef744" ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = alpha_fda802f3c408a66ef744;

/***/ },
/* 3 */
/*!**********************************************************************!*\
  !*** delegated ./a.js from dll-reference alpha_fda802f3c408a66ef744 ***!
  \**********************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(2))(2);

/***/ },
/* 4 */
/*!************************************************************************!*\
  !*** delegated ./beta.js from dll-reference beta_fda802f3c408a66ef744 ***!
  \************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(5))(3);

/***/ },
/* 5 */
/*!********************************************!*\
  !*** external "beta_fda802f3c408a66ef744" ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = beta_fda802f3c408a66ef744;

/***/ },
/* 6 */
/*!*********************************************************************!*\
  !*** delegated ./b.js from dll-reference beta_fda802f3c408a66ef744 ***!
  \*********************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(5))(4);

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 0d8279ed7b443d36b536
Version: webpack 1.9.5
Time: 84ms
    Asset     Size  Chunks             Chunk Names
output.js  3.66 kB       0  [emitted]  main
chunk    {0} output.js (main) 397 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 145 bytes {0} [built]
     + 6 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: 1e9d431b3cebd3bcea12
Version: webpack 1.9.5
Time: 170ms
    Asset       Size  Chunks             Chunk Names
output.js  541 bytes       0  [emitted]  main
chunk    {0} output.js (main) 397 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 145 bytes {0} [built]
     + 6 hidden modules
```