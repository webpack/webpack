# DllReference

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

This is the _reference_ bundle (with the manifests) for [dll user example](https://github.com/webpack/webpack/tree/master/examples/dll-user)


# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = {
	resolve: {
		extensions: [".js", ".jsx"]
	},
	entry: {
		alpha: ["./alpha", "./a", "module"],
		beta: ["./beta", "./b", "./c"]
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "MyDll.[name].js",
		library: "[name]_[hash]"
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "js", "[name]-manifest.json"),
			name: "[name]_[hash]"
		})
	]
};
```

# js/MyDll.alpha.js

``` javascript
var alpha_457b6718a3ff9f8c2d77 =
```
<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` js
/******/ (function(modules) { // webpackBootstrap
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
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
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
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
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
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!******************!*\
  !*** ./alpha.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = "alpha";

/***/ }),
/* 2 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = "a";

/***/ }),
/* 3 */
/*!*********************************!*\
  !*** ../node_modules/module.js ***!
  \*********************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = "module";

/***/ })
/******/ ]);
```

# js/alpha-manifest.json

``` javascript
{"name":"alpha_457b6718a3ff9f8c2d77","content":{"./alpha.js":{"id":1,"meta":{}},"./a.js":{"id":2,"meta":{}},"../node_modules/module.js":{"id":3,"meta":{}}}}
```

# Info

## Uncompressed

```
Hash: 457b6718a3ff9f8c2d77
Version: webpack 3.5.1
         Asset     Size  Chunks             Chunk Names
 MyDll.beta.js  3.31 kB       0  [emitted]  beta
MyDll.alpha.js  3.34 kB       1  [emitted]  alpha
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk    {0} MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta [4] dll beta 
    [4] dll beta 12 bytes {0} [built]
    [5] ./beta.js 24 bytes {0} [built]
        single entry ./beta [4] dll beta beta:0
    [6] ./b.js 21 bytes {0} [built]
        single entry ./b [4] dll beta beta:1
    [7] ./c.jsx 23 bytes {0} [built]
        single entry ./c [4] dll beta beta:2
chunk    {1} MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha [0] dll alpha 
    [0] dll alpha 12 bytes {1} [built]
    [1] ./alpha.js 25 bytes {1} [built]
        single entry ./alpha [0] dll alpha alpha:0
    [2] ./a.js 21 bytes {1} [built]
        single entry ./a [0] dll alpha alpha:1
     + 1 hidden module
```

## Minimized (uglify-js, no zip)

```
Hash: 457b6718a3ff9f8c2d77
Version: webpack 3.5.1
         Asset       Size  Chunks             Chunk Names
 MyDll.beta.js  627 bytes       0  [emitted]  beta
MyDll.alpha.js  628 bytes       1  [emitted]  alpha
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk    {0} MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta [4] dll beta 
    [4] dll beta 12 bytes {0} [built]
    [5] ./beta.js 24 bytes {0} [built]
        single entry ./beta [4] dll beta beta:0
    [6] ./b.js 21 bytes {0} [built]
        single entry ./b [4] dll beta beta:1
    [7] ./c.jsx 23 bytes {0} [built]
        single entry ./c [4] dll beta beta:2
chunk    {1} MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha [0] dll alpha 
    [0] dll alpha 12 bytes {1} [built]
    [1] ./alpha.js 25 bytes {1} [built]
        single entry ./alpha [0] dll alpha alpha:0
    [2] ./a.js 21 bytes {1} [built]
        single entry ./a [0] dll alpha alpha:1
     + 1 hidden module
```
