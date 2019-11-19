# DllUser

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

This is the _user_ bundle, which uses the manifest from [dll-reference example](https://github.com/webpack/webpack/tree/master/examples/dll)

# webpack.config.js

```javascript
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

```javascript
console.log(require("../dll/alpha"));
console.log(require("../dll/a"));

console.log(require("beta/beta"));
console.log(require("beta/b"));
console.log(require("beta/c"));

console.log(require("module"));
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!**************************************************************************!*\
  !*** delegated ./alpha.js from dll-reference alpha_dcd111488d58f7509919 ***!
  \**************************************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference alpha_dcd111488d58f7509919 */ 2))(1);

/***/ }),
/* 2 */
/*!*********************************************!*\
  !*** external "alpha_dcd111488d58f7509919" ***!
  \*********************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
module.exports = alpha_dcd111488d58f7509919;

/***/ }),
/* 3 */
/*!**********************************************************************!*\
  !*** delegated ./a.js from dll-reference alpha_dcd111488d58f7509919 ***!
  \**********************************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference alpha_dcd111488d58f7509919 */ 2))(2);

/***/ }),
/* 4 */
/*!************************************************************************!*\
  !*** delegated ./beta.js from dll-reference beta_dcd111488d58f7509919 ***!
  \************************************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference beta_dcd111488d58f7509919 */ 5))(5);

/***/ }),
/* 5 */
/*!********************************************!*\
  !*** external "beta_dcd111488d58f7509919" ***!
  \********************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
module.exports = beta_dcd111488d58f7509919;

/***/ }),
/* 6 */
/*!*********************************************************************!*\
  !*** delegated ./b.js from dll-reference beta_dcd111488d58f7509919 ***!
  \*********************************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference beta_dcd111488d58f7509919 */ 5))(6);

/***/ }),
/* 7 */
/*!**********************************************************************!*\
  !*** delegated ./c.jsx from dll-reference beta_dcd111488d58f7509919 ***!
  \**********************************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference beta_dcd111488d58f7509919 */ 5))(7);

/***/ }),
/* 8 */
/*!*****************************************************************************************!*\
  !*** delegated ../node_modules/module.js from dll-reference alpha_dcd111488d58f7509919 ***!
  \*****************************************************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference alpha_dcd111488d58f7509919 */ 2))(3);

/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
```

</details>

``` js
!function() {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__ */
console.log(__webpack_require__(/*! ../dll/alpha */ 1));
console.log(__webpack_require__(/*! ../dll/a */ 3));

console.log(__webpack_require__(/*! beta/beta */ 4));
console.log(__webpack_require__(/*! beta/b */ 6));
console.log(__webpack_require__(/*! beta/c */ 7));

console.log(__webpack_require__(/*! module */ 8));

}();
/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
    Asset      Size
output.js  5.51 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 541 bytes [entry] [rendered]
    > ./example.js main
 ./example.js 205 bytes [built]
     [used exports unknown]
     entry ./example.js main
 delegated ../node_modules/module.js from dll-reference alpha_dcd111488d58f7509919 42 bytes [built]
     [used exports unknown]
     cjs require module ./example.js 8:12-29
 delegated ./a.js from dll-reference alpha_dcd111488d58f7509919 42 bytes [built]
     [used exports unknown]
     cjs require ../dll/a ./example.js 2:12-31
 delegated ./alpha.js from dll-reference alpha_dcd111488d58f7509919 42 bytes [built]
     [used exports unknown]
     cjs require ../dll/alpha ./example.js 1:12-35
 delegated ./b.js from dll-reference beta_dcd111488d58f7509919 42 bytes [built]
     [used exports unknown]
     cjs require beta/b ./example.js 5:12-29
 delegated ./beta.js from dll-reference beta_dcd111488d58f7509919 42 bytes [built]
     [used exports unknown]
     cjs require beta/beta ./example.js 4:12-32
 delegated ./c.jsx from dll-reference beta_dcd111488d58f7509919 42 bytes [built]
     [used exports unknown]
     cjs require beta/c ./example.js 6:12-29
 external "alpha_dcd111488d58f7509919" 42 bytes [built]
     [used exports unknown]
     delegated source dll-reference alpha_dcd111488d58f7509919 delegated ./alpha.js from dll-reference alpha_dcd111488d58f7509919
     delegated source dll-reference alpha_dcd111488d58f7509919 delegated ./a.js from dll-reference alpha_dcd111488d58f7509919
     delegated source dll-reference alpha_dcd111488d58f7509919 delegated ../node_modules/module.js from dll-reference alpha_dcd111488d58f7509919
 external "beta_dcd111488d58f7509919" 42 bytes [built]
     [used exports unknown]
     delegated source dll-reference beta_dcd111488d58f7509919 delegated ./beta.js from dll-reference beta_dcd111488d58f7509919
     delegated source dll-reference beta_dcd111488d58f7509919 delegated ./b.js from dll-reference beta_dcd111488d58f7509919
     delegated source dll-reference beta_dcd111488d58f7509919 delegated ./c.jsx from dll-reference beta_dcd111488d58f7509919
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
    Asset       Size
output.js  589 bytes  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 541 bytes [entry] [rendered]
    > ./example.js main
 ./example.js 205 bytes [built]
     [no exports used]
     entry ./example.js main
 delegated ../node_modules/module.js from dll-reference alpha_dcd111488d58f7509919 42 bytes [built]
     cjs require module ./example.js 8:12-29
 delegated ./a.js from dll-reference alpha_dcd111488d58f7509919 42 bytes [built]
     cjs require ../dll/a ./example.js 2:12-31
 delegated ./alpha.js from dll-reference alpha_dcd111488d58f7509919 42 bytes [built]
     cjs require ../dll/alpha ./example.js 1:12-35
 delegated ./b.js from dll-reference beta_dcd111488d58f7509919 42 bytes [built]
     cjs require beta/b ./example.js 5:12-29
 delegated ./beta.js from dll-reference beta_dcd111488d58f7509919 42 bytes [built]
     cjs require beta/beta ./example.js 4:12-32
 delegated ./c.jsx from dll-reference beta_dcd111488d58f7509919 42 bytes [built]
     cjs require beta/c ./example.js 6:12-29
 external "alpha_dcd111488d58f7509919" 42 bytes [built]
     delegated source dll-reference alpha_dcd111488d58f7509919 delegated ./alpha.js from dll-reference alpha_dcd111488d58f7509919
     delegated source dll-reference alpha_dcd111488d58f7509919 delegated ./a.js from dll-reference alpha_dcd111488d58f7509919
     delegated source dll-reference alpha_dcd111488d58f7509919 delegated ../node_modules/module.js from dll-reference alpha_dcd111488d58f7509919
 external "beta_dcd111488d58f7509919" 42 bytes [built]
     delegated source dll-reference beta_dcd111488d58f7509919 delegated ./beta.js from dll-reference beta_dcd111488d58f7509919
     delegated source dll-reference beta_dcd111488d58f7509919 delegated ./b.js from dll-reference beta_dcd111488d58f7509919
     delegated source dll-reference beta_dcd111488d58f7509919 delegated ./c.jsx from dll-reference beta_dcd111488d58f7509919
```
