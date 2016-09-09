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

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 7);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*********************************************!*\
  !*** external "alpha_54a556952b9e02f550d5" ***!
  \*********************************************/
/***/ function(module, exports) {

	module.exports = alpha_54a556952b9e02f550d5;

/***/ },
/* 1 */
/*!********************************************!*\
  !*** external "beta_54a556952b9e02f550d5" ***!
  \********************************************/
/***/ function(module, exports) {

	module.exports = beta_54a556952b9e02f550d5;

/***/ },
/* 2 */
/*!**********************************************************************!*\
  !*** delegated ./a.js from dll-reference alpha_54a556952b9e02f550d5 ***!
  \**********************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(0))(0);

/***/ },
/* 3 */
/*!**************************************************************************!*\
  !*** delegated ./alpha.js from dll-reference alpha_54a556952b9e02f550d5 ***!
  \**************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(0))(1);

/***/ },
/* 4 */
/*!*********************************************************************!*\
  !*** delegated ./b.js from dll-reference beta_54a556952b9e02f550d5 ***!
  \*********************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(1))(2);

/***/ },
/* 5 */
/*!************************************************************************!*\
  !*** delegated ./beta.js from dll-reference beta_54a556952b9e02f550d5 ***!
  \************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(1))(3);

/***/ },
/* 6 */
/*!*****************************************************************************************!*\
  !*** delegated ../node_modules/module.js from dll-reference alpha_54a556952b9e02f550d5 ***!
  \*****************************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(0))(4);

/***/ },
/* 7 */
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
Hash: ee8143b5bc4e340adfc3
Version: webpack 2.1.0-beta.11
Time: 79ms
    Asset     Size  Chunks             Chunk Names
output.js  4.25 kB       0  [emitted]  main
chunk    {0} output.js (main) 474 bytes [rendered]
    > main [7] ./example.js 
    [7] ./example.js 180 bytes {0} [built]
     + 7 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: ee8143b5bc4e340adfc3
Version: webpack 2.1.0-beta.11
Time: 113ms
    Asset       Size  Chunks             Chunk Names
output.js  609 bytes       0  [emitted]  main
chunk    {0} output.js (main) 474 bytes [rendered]
    > main [7] ./example.js 
    [7] ./example.js 180 bytes {0} [built]
     + 7 hidden modules
```