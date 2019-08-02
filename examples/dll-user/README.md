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

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

```javascript
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

```javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

console.log(__webpack_require__(/*! ../dll/alpha */ 1));
console.log(__webpack_require__(/*! ../dll/a */ 3));

console.log(__webpack_require__(/*! beta/beta */ 4));
console.log(__webpack_require__(/*! beta/b */ 6));
console.log(__webpack_require__(/*! beta/c */ 7));

console.log(__webpack_require__(/*! module */ 8));


/***/ }),
/* 1 */
/*!**************************************************************************!*\
  !*** delegated ./alpha.js from dll-reference alpha_d61ee01b5c383d26e2c0 ***!
  \**************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference alpha_d61ee01b5c383d26e2c0 */ 2))(1);

/***/ }),
/* 2 */
/*!*********************************************!*\
  !*** external "alpha_d61ee01b5c383d26e2c0" ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = alpha_d61ee01b5c383d26e2c0;

/***/ }),
/* 3 */
/*!**********************************************************************!*\
  !*** delegated ./a.js from dll-reference alpha_d61ee01b5c383d26e2c0 ***!
  \**********************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference alpha_d61ee01b5c383d26e2c0 */ 2))(2);

/***/ }),
/* 4 */
/*!************************************************************************!*\
  !*** delegated ./beta.js from dll-reference beta_d61ee01b5c383d26e2c0 ***!
  \************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference beta_d61ee01b5c383d26e2c0 */ 5))(5);

/***/ }),
/* 5 */
/*!********************************************!*\
  !*** external "beta_d61ee01b5c383d26e2c0" ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = beta_d61ee01b5c383d26e2c0;

/***/ }),
/* 6 */
/*!*********************************************************************!*\
  !*** delegated ./b.js from dll-reference beta_d61ee01b5c383d26e2c0 ***!
  \*********************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference beta_d61ee01b5c383d26e2c0 */ 5))(6);

/***/ }),
/* 7 */
/*!**********************************************************************!*\
  !*** delegated ./c.jsx from dll-reference beta_d61ee01b5c383d26e2c0 ***!
  \**********************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference beta_d61ee01b5c383d26e2c0 */ 5))(7);

/***/ }),
/* 8 */
/*!*****************************************************************************************!*\
  !*** delegated ../node_modules/module.js from dll-reference alpha_d61ee01b5c383d26e2c0 ***!
  \*****************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference alpha_d61ee01b5c383d26e2c0 */ 2))(3);

/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
    Asset      Size  Chunks             Chunk Names
output.js  7.14 KiB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 541 bytes [entry] [rendered]
    > ./example.js main
 [0] ./example.js 205 bytes {0} [built]
     single entry ./example.js  main
 [1] delegated ./alpha.js from dll-reference alpha_d61ee01b5c383d26e2c0 42 bytes {0} [built]
     cjs require ../dll/alpha [0] ./example.js 1:12-35
 [2] external "alpha_d61ee01b5c383d26e2c0" 42 bytes {0} [built]
     delegated source dll-reference alpha_d61ee01b5c383d26e2c0 [1] delegated ./alpha.js from dll-reference alpha_d61ee01b5c383d26e2c0
     delegated source dll-reference alpha_d61ee01b5c383d26e2c0 [3] delegated ./a.js from dll-reference alpha_d61ee01b5c383d26e2c0
     delegated source dll-reference alpha_d61ee01b5c383d26e2c0 [8] delegated ../node_modules/module.js from dll-reference alpha_d61ee01b5c383d26e2c0
 [3] delegated ./a.js from dll-reference alpha_d61ee01b5c383d26e2c0 42 bytes {0} [built]
     cjs require ../dll/a [0] ./example.js 2:12-31
 [4] delegated ./beta.js from dll-reference beta_d61ee01b5c383d26e2c0 42 bytes {0} [built]
     cjs require beta/beta [0] ./example.js 4:12-32
 [5] external "beta_d61ee01b5c383d26e2c0" 42 bytes {0} [built]
     delegated source dll-reference beta_d61ee01b5c383d26e2c0 [4] delegated ./beta.js from dll-reference beta_d61ee01b5c383d26e2c0
     delegated source dll-reference beta_d61ee01b5c383d26e2c0 [6] delegated ./b.js from dll-reference beta_d61ee01b5c383d26e2c0
     delegated source dll-reference beta_d61ee01b5c383d26e2c0 [7] delegated ./c.jsx from dll-reference beta_d61ee01b5c383d26e2c0
 [6] delegated ./b.js from dll-reference beta_d61ee01b5c383d26e2c0 42 bytes {0} [built]
     cjs require beta/b [0] ./example.js 5:12-29
 [7] delegated ./c.jsx from dll-reference beta_d61ee01b5c383d26e2c0 42 bytes {0} [built]
     cjs require beta/c [0] ./example.js 6:12-29
 [8] delegated ../node_modules/module.js from dll-reference alpha_d61ee01b5c383d26e2c0 42 bytes {0} [built]
     cjs require module [0] ./example.js 8:12-29
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
    Asset      Size  Chunks             Chunk Names
output.js  1.33 KiB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 541 bytes [entry] [rendered]
    > ./example.js main
 [0] external "alpha_d61ee01b5c383d26e2c0" 42 bytes {0} [built]
     delegated source dll-reference alpha_d61ee01b5c383d26e2c0 [3] delegated ./alpha.js from dll-reference alpha_d61ee01b5c383d26e2c0
     delegated source dll-reference alpha_d61ee01b5c383d26e2c0 [4] delegated ./a.js from dll-reference alpha_d61ee01b5c383d26e2c0
     delegated source dll-reference alpha_d61ee01b5c383d26e2c0 [8] delegated ../node_modules/module.js from dll-reference alpha_d61ee01b5c383d26e2c0
 [1] external "beta_d61ee01b5c383d26e2c0" 42 bytes {0} [built]
     delegated source dll-reference beta_d61ee01b5c383d26e2c0 [5] delegated ./beta.js from dll-reference beta_d61ee01b5c383d26e2c0
     delegated source dll-reference beta_d61ee01b5c383d26e2c0 [6] delegated ./b.js from dll-reference beta_d61ee01b5c383d26e2c0
     delegated source dll-reference beta_d61ee01b5c383d26e2c0 [7] delegated ./c.jsx from dll-reference beta_d61ee01b5c383d26e2c0
 [2] ./example.js 205 bytes {0} [built]
     single entry ./example.js  main
 [3] delegated ./alpha.js from dll-reference alpha_d61ee01b5c383d26e2c0 42 bytes {0} [built]
     cjs require ../dll/alpha [2] ./example.js 1:12-35
 [4] delegated ./a.js from dll-reference alpha_d61ee01b5c383d26e2c0 42 bytes {0} [built]
     cjs require ../dll/a [2] ./example.js 2:12-31
 [5] delegated ./beta.js from dll-reference beta_d61ee01b5c383d26e2c0 42 bytes {0} [built]
     cjs require beta/beta [2] ./example.js 4:12-32
 [6] delegated ./b.js from dll-reference beta_d61ee01b5c383d26e2c0 42 bytes {0} [built]
     cjs require beta/b [2] ./example.js 5:12-29
 [7] delegated ./c.jsx from dll-reference beta_d61ee01b5c383d26e2c0 42 bytes {0} [built]
     cjs require beta/c [2] ./example.js 6:12-29
 [8] delegated ../node_modules/module.js from dll-reference alpha_d61ee01b5c383d26e2c0 42 bytes {0} [built]
     cjs require module [2] ./example.js 8:12-29
```
