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

```javascript
var alpha_d61ee01b5c383d26e2c0 =
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
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
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

```javascript
{"name":"alpha_d61ee01b5c383d26e2c0","content":{"./alpha.js":{"id":1,"buildMeta":{"providedExports":true}},"./a.js":{"id":2,"buildMeta":{"providedExports":true}},"../node_modules/module.js":{"id":3,"buildMeta":{"providedExports":true}}}}
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
         Asset      Size  Chunks             Chunk Names
MyDll.alpha.js  4.42 KiB       0  [emitted]  alpha
 MyDll.beta.js   4.4 KiB       1  [emitted]  beta
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk    {0} MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha
 [0] dll alpha 12 bytes {0} [built]
     dll entry 
      DllPlugin
 [1] ./alpha.js 25 bytes {0} [built]
     single entry ./alpha [0] dll alpha alpha[0]
      DllPlugin
 [2] ./a.js 21 bytes {0} [built]
     single entry ./a [0] dll alpha alpha[1]
      DllPlugin
     + 1 hidden module
chunk    {1} MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta
 [4] dll beta 12 bytes {1} [built]
     dll entry 
      DllPlugin
 [5] ./beta.js 24 bytes {1} [built]
     single entry ./beta [4] dll beta beta[0]
      DllPlugin
 [6] ./b.js 21 bytes {1} [built]
     single entry ./b [4] dll beta beta[1]
      DllPlugin
 [7] ./c.jsx 23 bytes {1} [built]
     single entry ./c [4] dll beta beta[2]
      DllPlugin
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
         Asset      Size  Chunks             Chunk Names
MyDll.alpha.js  1.06 KiB       0  [emitted]  alpha
 MyDll.beta.js  1.05 KiB       1  [emitted]  beta
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk    {0} MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha
 [0] dll alpha 12 bytes {0} [built]
     dll entry 
      DllPlugin
 [1] ./alpha.js 25 bytes {0} [built]
     single entry ./alpha [0] dll alpha alpha[0]
      DllPlugin
 [2] ./a.js 21 bytes {0} [built]
     single entry ./a [0] dll alpha alpha[1]
      DllPlugin
     + 1 hidden module
chunk    {1} MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta
 [4] dll beta 12 bytes {1} [built]
     dll entry 
      DllPlugin
 [5] ./beta.js 24 bytes {1} [built]
     single entry ./beta [4] dll beta beta[0]
      DllPlugin
 [6] ./b.js 21 bytes {1} [built]
     single entry ./b [4] dll beta beta[1]
      DllPlugin
 [7] ./c.jsx 23 bytes {1} [built]
     single entry ./c [4] dll beta beta[2]
      DllPlugin
```
