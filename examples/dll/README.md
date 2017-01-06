# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = {
	resolve: {
		extensions: ['.js', '.jsx']
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
var alpha_282e8826843b2bb4eeb1 =
```
<details><summary>`/******/ (function(modules) { /* webpackBootstrap */ })`</summary>
``` js
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

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

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

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 6);
/******/ })
/************************************************************************/
```
</details>
``` js
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports) {

module.exports = "a";

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!******************!*\
  !*** ./alpha.js ***!
  \******************/
/***/ function(module, exports) {

module.exports = "alpha";

/***/ },
/* 2 */,
/* 3 */,
/* 4 */,
/* 5 */
/* unknown exports provided */
/* all exports used */
/*!**********************!*\
  !*** ../~/module.js ***!
  \**********************/
/***/ function(module, exports) {

module.exports = "module";

/***/ },
/* 6 */
/* unknown exports provided */
/* all exports used */
/*!*****************!*\
  !*** dll alpha ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

module.exports = __webpack_require__;

/***/ }
/******/ ]);
```

# js/alpha-manifest.json

``` javascript
{
  "name": "alpha_282e8826843b2bb4eeb1",
  "content": {
    "./a.js": {
      "id": 0,
      "meta": {}
    },
    "./alpha.js": {
      "id": 1,
      "meta": {}
    },
    "../node_modules/module.js": {
      "id": 5,
      "meta": {}
    }
  }
}
```

# Info

## Uncompressed

```
Hash: 282e8826843b2bb4eeb1
Version: webpack 2.2.0-rc.2
         Asset     Size  Chunks             Chunk Names
 MyDll.beta.js  3.34 kB       0  [emitted]  beta
MyDll.alpha.js  3.36 kB       1  [emitted]  alpha
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk    {0} MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta [7] dll beta 
    [2] ./b.js 21 bytes {0} [built]
        single entry ./b [7] dll beta
    [3] ./beta.js 24 bytes {0} [built]
        single entry ./beta [7] dll beta
    [4] ./c.jsx 23 bytes {0} [built]
        single entry ./c [7] dll beta
    [7] dll beta 12 bytes {0} [built]
chunk    {1} MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha [6] dll alpha 
    [0] ./a.js 21 bytes {1} [built]
        single entry ./a [6] dll alpha
    [1] ./alpha.js 25 bytes {1} [built]
        single entry ./alpha [6] dll alpha
    [5] ../~/module.js 26 bytes {1} [built]
        single entry module [6] dll alpha
    [6] dll alpha 12 bytes {1} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 282e8826843b2bb4eeb1
Version: webpack 2.2.0-rc.2
         Asset       Size  Chunks             Chunk Names
 MyDll.beta.js  653 bytes       0  [emitted]  beta
MyDll.alpha.js  657 bytes       1  [emitted]  alpha
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk    {0} MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta [7] dll beta 
    [2] ./b.js 21 bytes {0} [built]
        single entry ./b [7] dll beta
    [3] ./beta.js 24 bytes {0} [built]
        single entry ./beta [7] dll beta
    [4] ./c.jsx 23 bytes {0} [built]
        single entry ./c [7] dll beta
    [7] dll beta 12 bytes {0} [built]
chunk    {1} MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha [6] dll alpha 
    [0] ./a.js 21 bytes {1} [built]
        single entry ./a [6] dll alpha
    [1] ./alpha.js 25 bytes {1} [built]
        single entry ./alpha [6] dll alpha
    [5] ../~/module.js 26 bytes {1} [built]
        single entry module [6] dll alpha
    [6] dll alpha 12 bytes {1} [built]
```