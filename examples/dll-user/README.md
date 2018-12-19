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
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
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
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
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
/*! runtime requirements: __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

console.log(__webpack_require__(/*! ../dll/alpha */ 1));
console.log(__webpack_require__(/*! ../dll/a */ 3));

console.log(__webpack_require__(/*! beta/beta */ 4));
console.log(__webpack_require__(/*! beta/b */ 6));
console.log(__webpack_require__(/*! beta/c */ 7));

console.log(__webpack_require__(/*! module */ 8));


/***/ }),
/* 1 */
/*!**************************************************************************!*\
  !*** delegated ./alpha.js from dll-reference alpha_382bfbbbdad9425c171d ***!
  \**************************************************************************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference alpha_382bfbbbdad9425c171d */ 2))(1);

/***/ }),
/* 2 */
/*!*********************************************!*\
  !*** external "alpha_382bfbbbdad9425c171d" ***!
  \*********************************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = alpha_382bfbbbdad9425c171d;

/***/ }),
/* 3 */
/*!**********************************************************************!*\
  !*** delegated ./a.js from dll-reference alpha_382bfbbbdad9425c171d ***!
  \**********************************************************************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference alpha_382bfbbbdad9425c171d */ 2))(2);

/***/ }),
/* 4 */
/*!************************************************************************!*\
  !*** delegated ./beta.js from dll-reference beta_382bfbbbdad9425c171d ***!
  \************************************************************************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference beta_382bfbbbdad9425c171d */ 5))(5);

/***/ }),
/* 5 */
/*!********************************************!*\
  !*** external "beta_382bfbbbdad9425c171d" ***!
  \********************************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = beta_382bfbbbdad9425c171d;

/***/ }),
/* 6 */
/*!*********************************************************************!*\
  !*** delegated ./b.js from dll-reference beta_382bfbbbdad9425c171d ***!
  \*********************************************************************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference beta_382bfbbbdad9425c171d */ 5))(6);

/***/ }),
/* 7 */
/*!**********************************************************************!*\
  !*** delegated ./c.jsx from dll-reference beta_382bfbbbdad9425c171d ***!
  \**********************************************************************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference beta_382bfbbbdad9425c171d */ 5))(7);

/***/ }),
/* 8 */
/*!*****************************************************************************************!*\
  !*** delegated ../node_modules/module.js from dll-reference alpha_382bfbbbdad9425c171d ***!
  \*****************************************************************************************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference alpha_382bfbbbdad9425c171d */ 2))(3);

/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset      Size  Chunks             Chunk Names
output.js  5.26 KiB     {0}  [emitted]  main
Entrypoint main = output.js
chunk {0} output.js (main) 541 bytes [entry] [rendered]
    > .\example.js main
 [0] ./example.js 205 bytes {0} [built]
     [used exports unknown]
     entry .\example.js main
 [1] delegated ./alpha.js from dll-reference alpha_382bfbbbdad9425c171d 42 bytes {0} [built]
     [used exports unknown]
     cjs require ../dll/alpha [0] ./example.js 1:12-35
 [2] external "alpha_382bfbbbdad9425c171d" 42 bytes {0} [built]
     [used exports unknown]
     delegated source dll-reference alpha_382bfbbbdad9425c171d [1] delegated ./alpha.js from dll-reference alpha_382bfbbbdad9425c171d
     delegated source dll-reference alpha_382bfbbbdad9425c171d [3] delegated ./a.js from dll-reference alpha_382bfbbbdad9425c171d
     delegated source dll-reference alpha_382bfbbbdad9425c171d [8] delegated ../node_modules/module.js from dll-reference alpha_382bfbbbdad9425c171d
 [3] delegated ./a.js from dll-reference alpha_382bfbbbdad9425c171d 42 bytes {0} [built]
     [used exports unknown]
     cjs require ../dll/a [0] ./example.js 2:12-31
 [4] delegated ./beta.js from dll-reference beta_382bfbbbdad9425c171d 42 bytes {0} [built]
     [used exports unknown]
     cjs require beta/beta [0] ./example.js 4:12-32
 [5] external "beta_382bfbbbdad9425c171d" 42 bytes {0} [built]
     [used exports unknown]
     delegated source dll-reference beta_382bfbbbdad9425c171d [4] delegated ./beta.js from dll-reference beta_382bfbbbdad9425c171d
     delegated source dll-reference beta_382bfbbbdad9425c171d [6] delegated ./b.js from dll-reference beta_382bfbbbdad9425c171d
     delegated source dll-reference beta_382bfbbbdad9425c171d [7] delegated ./c.jsx from dll-reference beta_382bfbbbdad9425c171d
 [6] delegated ./b.js from dll-reference beta_382bfbbbdad9425c171d 42 bytes {0} [built]
     [used exports unknown]
     cjs require beta/b [0] ./example.js 5:12-29
 [7] delegated ./c.jsx from dll-reference beta_382bfbbbdad9425c171d 42 bytes {0} [built]
     [used exports unknown]
     cjs require beta/c [0] ./example.js 6:12-29
 [8] delegated ../node_modules/module.js from dll-reference alpha_382bfbbbdad9425c171d 42 bytes {0} [built]
     [used exports unknown]
     cjs require module [0] ./example.js 8:12-29
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset       Size  Chunks             Chunk Names
output.js  677 bytes   {404}  [emitted]  main
Entrypoint main = output.js
chunk {404} output.js (main) 541 bytes [entry] [rendered]
    > .\example.js main
 [275] ./example.js 205 bytes {404} [built]
       entry .\example.js main
 [298] delegated ./b.js from dll-reference beta_382bfbbbdad9425c171d 42 bytes {404} [built]
       cjs require beta/b [275] ./example.js 5:12-29
 [313] external "alpha_382bfbbbdad9425c171d" 42 bytes {404} [built]
       delegated source dll-reference alpha_382bfbbbdad9425c171d [459] delegated ../node_modules/module.js from dll-reference alpha_382bfbbbdad9425c171d
       delegated source dll-reference alpha_382bfbbbdad9425c171d [760] delegated ./alpha.js from dll-reference alpha_382bfbbbdad9425c171d
       delegated source dll-reference alpha_382bfbbbdad9425c171d [771] delegated ./a.js from dll-reference alpha_382bfbbbdad9425c171d
 [459] delegated ../node_modules/module.js from dll-reference alpha_382bfbbbdad9425c171d 42 bytes {404} [built]
       cjs require module [275] ./example.js 8:12-29
 [668] delegated ./c.jsx from dll-reference beta_382bfbbbdad9425c171d 42 bytes {404} [built]
       cjs require beta/c [275] ./example.js 6:12-29
 [744] external "beta_382bfbbbdad9425c171d" 42 bytes {404} [built]
       delegated source dll-reference beta_382bfbbbdad9425c171d [298] delegated ./b.js from dll-reference beta_382bfbbbdad9425c171d
       delegated source dll-reference beta_382bfbbbdad9425c171d [668] delegated ./c.jsx from dll-reference beta_382bfbbbdad9425c171d
       delegated source dll-reference beta_382bfbbbdad9425c171d [967] delegated ./beta.js from dll-reference beta_382bfbbbdad9425c171d
 [760] delegated ./alpha.js from dll-reference alpha_382bfbbbdad9425c171d 42 bytes {404} [built]
       cjs require ../dll/alpha [275] ./example.js 1:12-35
 [771] delegated ./a.js from dll-reference alpha_382bfbbbdad9425c171d 42 bytes {404} [built]
       cjs require ../dll/a [275] ./example.js 2:12-31
 [967] delegated ./beta.js from dll-reference beta_382bfbbbdad9425c171d 42 bytes {404} [built]
       cjs require beta/beta [275] ./example.js 4:12-32
```
