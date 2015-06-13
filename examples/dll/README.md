# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = {
	entry: {
		alpha: ["./alpha", "./a"],
		beta: ["./beta", "./b"]
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
var alpha_fda802f3c408a66ef744 =
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
/*!*****************!*\
  !*** dll alpha ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__;

/***/ },
/* 1 */
/*!******************!*\
  !*** ./alpha.js ***!
  \******************/
/***/ function(module, exports) {

	module.exports = "alpha";

/***/ },
/* 2 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports) {

	module.exports = "a";

/***/ }
/******/ ]);
```

# js/alpha-manifest.json

``` javascript
{
  "name": "alpha_fda802f3c408a66ef744",
  "content": {
    "./alpha.js": 1,
    "./a.js": 2
  }
}
```

# Info

## Uncompressed

```
Hash: fda802f3c408a66ef744
Version: webpack 1.9.10
Time: 69ms
         Asset     Size  Chunks             Chunk Names
MyDll.alpha.js  1.84 kB       0  [emitted]  alpha
 MyDll.beta.js  1.85 kB       1  [emitted]  beta
chunk    {0} MyDll.alpha.js (alpha) 58 bytes [rendered]
    > alpha [0] dll alpha 
    [0] dll alpha 12 bytes {0} [built]
    [1] ./alpha.js 25 bytes {0} [built]
        single entry ./alpha [0] dll alpha
    [2] ./a.js 21 bytes {0} [built]
        single entry ./a [0] dll alpha
chunk    {1} MyDll.beta.js (beta) 57 bytes [rendered]
    > beta [0] dll beta 
    [0] dll beta 12 bytes {1} [built]
    [3] ./beta.js 24 bytes {1} [built]
        single entry ./beta [0] dll beta
    [4] ./b.js 21 bytes {1} [built]
        single entry ./b [0] dll beta
```

## Minimized (uglify-js, no zip)

```
Hash: 28b01778c3ed267edad7
Version: webpack 1.9.10
Time: 173ms
         Asset       Size  Chunks             Chunk Names
 MyDll.beta.js  326 bytes       0  [emitted]  beta
MyDll.alpha.js  326 bytes       1  [emitted]  alpha
chunk    {0} MyDll.beta.js (beta) 57 bytes [rendered]
    > beta [0] dll beta 
    [0] dll beta 12 bytes {0} [built]
    [3] ./b.js 21 bytes {0} [built]
        single entry ./b [0] dll beta
    [4] ./beta.js 24 bytes {0} [built]
        single entry ./beta [0] dll beta
chunk    {1} MyDll.alpha.js (alpha) 58 bytes [rendered]
    > alpha [0] dll alpha 
    [0] dll alpha 12 bytes {1} [built]
    [1] ./a.js 21 bytes {1} [built]
        single entry ./a [0] dll alpha
    [2] ./alpha.js 25 bytes {1} [built]
        single entry ./alpha [0] dll alpha
```