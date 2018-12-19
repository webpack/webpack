# DllReference

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

This is the _reference_ bundle (with the manifests) for [dll user example](https://github.com/webpack/webpack/tree/master/examples/dll-user)


# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = {
	// mode: "development || "production",
	resolve: {
		extensions: [".js", ".jsx"]
	},
	entry: {
		alpha: ["./alpha", "./a", "module"],
		beta: ["./beta", "./b", "./c"]
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "MyDll.[name].js",
		library: "[name]_[hash]"
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "dist", "[name]-manifest.json"),
			name: "[name]_[hash]"
		})
	]
};
```

# dist/MyDll.alpha.js

``` javascript
var alpha_382bfbbbdad9425c171d =
```
<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` js
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

``` js
/******/ ([
/* 0 */
/*!*****************!*\
  !*** dll alpha ***!
  \*****************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, module */
/*! all exports used */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!******************!*\
  !*** ./alpha.js ***!
  \******************/
/*! no static exports found */
/*! runtime requirements: module */
/*! all exports used */
/***/ (function(module) {

module.exports = "alpha";

/***/ }),
/* 2 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! no static exports found */
/*! runtime requirements: module */
/*! all exports used */
/***/ (function(module) {

module.exports = "a";

/***/ }),
/* 3 */
/*!*********************************!*\
  !*** ../node_modules/module.js ***!
  \*********************************/
/*! no static exports found */
/*! runtime requirements: module */
/*! all exports used */
/***/ (function(module) {

module.exports = "module";

/***/ })
/******/ ]);
```

# dist/alpha-manifest.json

``` javascript
{"name":"alpha_382bfbbbdad9425c171d","content":{"./alpha.js":{"id":1,"buildMeta":{"providedExports":true}},"./a.js":{"id":2,"buildMeta":{"providedExports":true}},"../node_modules/module.js":{"id":3,"buildMeta":{"providedExports":true}}}}
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
         Asset      Size  Chunks             Chunk Names
MyDll.alpha.js  2.19 KiB     {0}  [emitted]  alpha
 MyDll.beta.js  2.16 KiB     {1}  [emitted]  beta
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk {0} MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha
 [0] dll alpha 12 bytes {0} [built]
     dll entry
     DllPlugin
 [1] ./alpha.js 25 bytes {0} [built]
     entry ./alpha [0] dll alpha alpha[0]
     DllPlugin
 [2] ./a.js 21 bytes {0} [built]
     entry ./a [0] dll alpha alpha[1]
     DllPlugin
 [3] ../node_modules/module.js 26 bytes {0} [built]
     entry module [0] dll alpha alpha[2]
     DllPlugin
chunk {1} MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta
 [4] dll beta 12 bytes {1} [built]
     dll entry
     DllPlugin
 [5] ./beta.js 24 bytes {1} [built]
     entry ./beta [4] dll beta beta[0]
     DllPlugin
 [6] ./b.js 21 bytes {1} [built]
     entry ./b [4] dll beta beta[1]
     DllPlugin
 [7] ./c.jsx 23 bytes {1} [built]
     entry ./c [4] dll beta beta[2]
     DllPlugin
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
         Asset       Size  Chunks             Chunk Names
MyDll.alpha.js  353 bytes   {963}  [emitted]  alpha
 MyDll.beta.js  347 bytes   {188}  [emitted]  beta
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk {188} MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta
  [21] ./b.js 21 bytes {188} [built]
       entry ./b [350] dll beta beta[1]
       DllPlugin
 [145] ./beta.js 24 bytes {188} [built]
       entry ./beta [350] dll beta beta[0]
       DllPlugin
 [235] ./c.jsx 23 bytes {188} [built]
       entry ./c [350] dll beta beta[2]
       DllPlugin
 [350] dll beta 12 bytes {188} [built]
       dll entry
       DllPlugin
chunk {963} MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha
 [162] ./a.js 21 bytes {963} [built]
       entry ./a [673] dll alpha alpha[1]
       DllPlugin
 [673] dll alpha 12 bytes {963} [built]
       dll entry
       DllPlugin
 [683] ../node_modules/module.js 26 bytes {963} [built]
       entry module [673] dll alpha alpha[2]
       DllPlugin
 [930] ./alpha.js 25 bytes {963} [built]
       entry ./alpha [673] dll alpha alpha[0]
       DllPlugin
```
