# DllUser

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

This is the _user_ bundle, which uses the manifest from [dll-reference example](https://github.com/webpack/webpack/tree/master/examples/dll)

# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = {
	mode: "production",
	plugins: [
		new webpack.DllReferencePlugin({
			context: path.join(__dirname, "..", "dll"),
			manifest: require("../dll/js/alpha-manifest.json") // eslint-disable-line
		}),
		new webpack.DllReferencePlugin({
			scope: "beta",
			manifest: require("../dll/js/beta-manifest.json"), // eslint-disable-line
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

# js/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
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
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!*********************************************!*\
  !*** external "alpha_6d91db854aef9bf446d4" ***!
  \*********************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {

module.exports = alpha_6d91db854aef9bf446d4;

/***/ }),
/* 1 */
/*!********************************************!*\
  !*** external "beta_6d91db854aef9bf446d4" ***!
  \********************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {

module.exports = beta_6d91db854aef9bf446d4;

/***/ }),
/* 2 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

console.log(__webpack_require__(/*! ../dll/alpha */ 3));
console.log(__webpack_require__(/*! ../dll/a */ 4));

console.log(__webpack_require__(/*! beta/beta */ 5));
console.log(__webpack_require__(/*! beta/b */ 6));
console.log(__webpack_require__(/*! beta/c */ 7));

console.log(__webpack_require__(/*! module */ 8));


/***/ }),
/* 3 */
/*!**************************************************************************!*\
  !*** delegated ./alpha.js from dll-reference alpha_6d91db854aef9bf446d4 ***!
  \**************************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(1);

/***/ }),
/* 4 */
/*!**********************************************************************!*\
  !*** delegated ./a.js from dll-reference alpha_6d91db854aef9bf446d4 ***!
  \**********************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(2);

/***/ }),
/* 5 */
/*!************************************************************************!*\
  !*** delegated ./beta.js from dll-reference beta_6d91db854aef9bf446d4 ***!
  \************************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(1))(5);

/***/ }),
/* 6 */
/*!*********************************************************************!*\
  !*** delegated ./b.js from dll-reference beta_6d91db854aef9bf446d4 ***!
  \*********************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(1))(6);

/***/ }),
/* 7 */
/*!**********************************************************************!*\
  !*** delegated ./c.jsx from dll-reference beta_6d91db854aef9bf446d4 ***!
  \**********************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(1))(7);

/***/ }),
/* 8 */
/*!*****************************************************************************************!*\
  !*** delegated ../node_modules/module.js from dll-reference alpha_6d91db854aef9bf446d4 ***!
  \*****************************************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(3);

/***/ })
/******/ ]);
```

# Info

## Uncompressed

```
Hash: de10be9bbcb3d59901b3
Version: webpack next
    Asset      Size  Chunks             Chunk Names
output.js  6.73 KiB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 549 bytes [entry] [rendered]
    > main [2] ./example.js 
    [0] external "alpha_6d91db854aef9bf446d4" 42 bytes {0} [built]
        delegated source dll-reference alpha_6d91db854aef9bf446d4 [3] delegated ./alpha.js from dll-reference alpha_6d91db854aef9bf446d4
        delegated source dll-reference alpha_6d91db854aef9bf446d4 [4] delegated ./a.js from dll-reference alpha_6d91db854aef9bf446d4
        delegated source dll-reference alpha_6d91db854aef9bf446d4 [8] delegated ../node_modules/module.js from dll-reference alpha_6d91db854aef9bf446d4
    [1] external "beta_6d91db854aef9bf446d4" 42 bytes {0} [built]
        delegated source dll-reference beta_6d91db854aef9bf446d4 [5] delegated ./beta.js from dll-reference beta_6d91db854aef9bf446d4
        delegated source dll-reference beta_6d91db854aef9bf446d4 [6] delegated ./b.js from dll-reference beta_6d91db854aef9bf446d4
        delegated source dll-reference beta_6d91db854aef9bf446d4 [7] delegated ./c.jsx from dll-reference beta_6d91db854aef9bf446d4
    [2] ./example.js 213 bytes {0} [built]
        single entry .\example.js  main
    [3] delegated ./alpha.js from dll-reference alpha_6d91db854aef9bf446d4 42 bytes {0} [built]
        cjs require ../dll/alpha [2] ./example.js 1:12-35
    [4] delegated ./a.js from dll-reference alpha_6d91db854aef9bf446d4 42 bytes {0} [built]
        cjs require ../dll/a [2] ./example.js 2:12-31
    [5] delegated ./beta.js from dll-reference beta_6d91db854aef9bf446d4 42 bytes {0} [built]
        cjs require beta/beta [2] ./example.js 4:12-32
    [6] delegated ./b.js from dll-reference beta_6d91db854aef9bf446d4 42 bytes {0} [built]
        cjs require beta/b [2] ./example.js 5:12-29
    [7] delegated ./c.jsx from dll-reference beta_6d91db854aef9bf446d4 42 bytes {0} [built]
        cjs require beta/c [2] ./example.js 6:12-29
    [8] delegated ../node_modules/module.js from dll-reference alpha_6d91db854aef9bf446d4 42 bytes {0} [built]
        cjs require module [2] ./example.js 8:12-29
```

## Minimized (uglify-js, no zip)

```
Hash: de10be9bbcb3d59901b3
Version: webpack next
    Asset       Size  Chunks             Chunk Names
output.js  970 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 549 bytes [entry] [rendered]
    > main [2] ./example.js 
    [0] external "alpha_6d91db854aef9bf446d4" 42 bytes {0} [built]
        delegated source dll-reference alpha_6d91db854aef9bf446d4 [3] delegated ./alpha.js from dll-reference alpha_6d91db854aef9bf446d4
        delegated source dll-reference alpha_6d91db854aef9bf446d4 [4] delegated ./a.js from dll-reference alpha_6d91db854aef9bf446d4
        delegated source dll-reference alpha_6d91db854aef9bf446d4 [8] delegated ../node_modules/module.js from dll-reference alpha_6d91db854aef9bf446d4
    [1] external "beta_6d91db854aef9bf446d4" 42 bytes {0} [built]
        delegated source dll-reference beta_6d91db854aef9bf446d4 [5] delegated ./beta.js from dll-reference beta_6d91db854aef9bf446d4
        delegated source dll-reference beta_6d91db854aef9bf446d4 [6] delegated ./b.js from dll-reference beta_6d91db854aef9bf446d4
        delegated source dll-reference beta_6d91db854aef9bf446d4 [7] delegated ./c.jsx from dll-reference beta_6d91db854aef9bf446d4
    [2] ./example.js 213 bytes {0} [built]
        single entry .\example.js  main
    [3] delegated ./alpha.js from dll-reference alpha_6d91db854aef9bf446d4 42 bytes {0} [built]
        cjs require ../dll/alpha [2] ./example.js 1:12-35
    [4] delegated ./a.js from dll-reference alpha_6d91db854aef9bf446d4 42 bytes {0} [built]
        cjs require ../dll/a [2] ./example.js 2:12-31
    [5] delegated ./beta.js from dll-reference beta_6d91db854aef9bf446d4 42 bytes {0} [built]
        cjs require beta/beta [2] ./example.js 4:12-32
    [6] delegated ./b.js from dll-reference beta_6d91db854aef9bf446d4 42 bytes {0} [built]
        cjs require beta/b [2] ./example.js 5:12-29
    [7] delegated ./c.jsx from dll-reference beta_6d91db854aef9bf446d4 42 bytes {0} [built]
        cjs require beta/c [2] ./example.js 6:12-29
    [8] delegated ../node_modules/module.js from dll-reference alpha_6d91db854aef9bf446d4 42 bytes {0} [built]
        cjs require module [2] ./example.js 8:12-29
```
