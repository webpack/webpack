# DllReference

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

This is the _reference_ bundle (with the manifests) for [dll user example](https://github.com/webpack/webpack/tree/master/examples/dll-user)

# webpack.config.js

```javascript
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
		library: "[name]_[fullhash]"
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "dist", "[name]-manifest.json"),
			name: "[name]_[fullhash]"
		})
	]
};
```

# dist/MyDll.alpha.js

```javascript
var alpha_5a1a523b0fc11616dffc =
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
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(0);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
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
/*! other exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_require__module,  */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!******************!*\
  !*** ./alpha.js ***!
  \******************/
/*! other exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "alpha";

/***/ }),
/* 2 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! other exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "a";

/***/ }),
/* 3 */
/*!*********************************!*\
  !*** ../node_modules/module.js ***!
  \*********************************/
/*! other exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "module";

/***/ })
/******/ ]);
```

# dist/alpha-manifest.json

```javascript
{"name":"alpha_5a1a523b0fc11616dffc","content":{"./alpha.js":{"id":1,"buildMeta":{}},"./a.js":{"id":2,"buildMeta":{}},"../node_modules/module.js":{"id":3,"buildMeta":{}}}}
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.11
         Asset      Size  Chunks             Chunk Names
MyDll.alpha.js  2.44 KiB     {0}  [emitted]  alpha
 MyDll.beta.js  2.41 KiB     {1}  [emitted]  beta
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
Version: webpack 5.0.0-alpha.11
         Asset       Size  Chunks             Chunk Names
MyDll.alpha.js  354 bytes   {487}  [emitted]  alpha
 MyDll.beta.js  345 bytes   {904}  [emitted]  beta
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk {487} MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha
 [258] dll alpha 12 bytes {487} [built]
       dll entry
       DllPlugin
 [443] ../node_modules/module.js 26 bytes {487} [built]
       entry module [258] dll alpha alpha[2]
       DllPlugin
 [758] ./alpha.js 25 bytes {487} [built]
       entry ./alpha [258] dll alpha alpha[0]
       DllPlugin
 [847] ./a.js 21 bytes {487} [built]
       entry ./a [258] dll alpha alpha[1]
       DllPlugin
chunk {904} MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta
  [15] dll beta 12 bytes {904} [built]
       dll entry
       DllPlugin
  [60] ./c.jsx 23 bytes {904} [built]
       entry ./c [15] dll beta beta[2]
       DllPlugin
  [97] ./beta.js 24 bytes {904} [built]
       entry ./beta [15] dll beta beta[0]
       DllPlugin
 [996] ./b.js 21 bytes {904} [built]
       entry ./b [15] dll beta beta[1]
       DllPlugin
```
