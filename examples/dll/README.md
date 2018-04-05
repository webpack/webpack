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
var alpha_53e9c88e69872d1acfd3 =
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
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
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
/******/ 	__webpack_require__.p = "dist/";
/******/
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

# dist/alpha-manifest.json

``` javascript
{"name":"alpha_53e9c88e69872d1acfd3","content":{"./alpha.js":{"id":1,"buildMeta":{"providedExports":true}},"./a.js":{"id":2,"buildMeta":{"providedExports":true}},"../node_modules/module.js":{"id":3,"buildMeta":{"providedExports":true}}}}
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.5.0
         Asset      Size  Chunks             Chunk Names
MyDll.alpha.js  3.46 KiB       0  [emitted]  alpha
 MyDll.beta.js  3.43 KiB       1  [emitted]  beta
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk    {0} MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha
    [0] dll alpha 12 bytes {0} [built]
        dll entry 
        
    [1] ./alpha.js 25 bytes {0} [built]
        
        single entry ./alpha [0] dll alpha alpha:0
    [2] ./a.js 21 bytes {0} [built]
        
        single entry ./a [0] dll alpha alpha:1
     + 1 hidden module
chunk    {1} MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta
    [4] dll beta 12 bytes {1} [built]
        dll entry 
        
    [5] ./beta.js 24 bytes {1} [built]
        
        single entry ./beta [4] dll beta beta:0
    [6] ./b.js 21 bytes {1} [built]
        
        single entry ./b [4] dll beta beta:1
    [7] ./c.jsx 23 bytes {1} [built]
        
        single entry ./c [4] dll beta beta:2
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.5.0
         Asset       Size  Chunks             Chunk Names
 MyDll.beta.js  691 bytes       0  [emitted]  beta
MyDll.alpha.js  700 bytes       1  [emitted]  alpha
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk    {0} MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta
    [0] ./c.jsx 23 bytes {0} [built]
        
        single entry ./c [3] dll beta beta:2
    [1] ./b.js 21 bytes {0} [built]
        
        single entry ./b [3] dll beta beta:1
    [2] ./beta.js 24 bytes {0} [built]
        
        single entry ./beta [3] dll beta beta:0
    [3] dll beta 12 bytes {0} [built]
        dll entry 
        
chunk    {1} MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha
    [5] ./a.js 21 bytes {1} [built]
        
        single entry ./a [7] dll alpha alpha:1
    [6] ./alpha.js 25 bytes {1} [built]
        
        single entry ./alpha [7] dll alpha alpha:0
    [7] dll alpha 12 bytes {1} [built]
        dll entry 
        
     + 1 hidden module
```
