
# example.js

``` javascript
if(ENV === "mobile") {
	require("./mobile-stuff");
}
console.log("Running " + ENV + " build");
```

# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = [
	{
		name: "mobile",
		// mode: "development || "production",
		entry: "./example",
		output: {
			path: path.join(__dirname, "dist"),
			filename: "mobile.js"
		},
		plugins: [
			new webpack.DefinePlugin({
				ENV: JSON.stringify("mobile")
			})
		]
	},

	{
		name: "desktop",
		// mode: "development || "production",
		entry: "./example",
		output: {
			path: path.join(__dirname, "dist"),
			filename: "desktop.js"
		},
		plugins: [
			new webpack.DefinePlugin({
				ENV: JSON.stringify("desktop")
			})
		]
	}
];
```

# dist/desktop.js

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
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

if(false) {}
console.log("Running " + "desktop" + " build");

/***/ })
/******/ ]);
```

# dist/mobile.js

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
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

if(true) {
	__webpack_require__(/*! ./mobile-stuff */ 1);
}
console.log("Running " + "mobile" + " build");

/***/ }),
/* 1 */
/*!*************************!*\
  !*** ./mobile-stuff.js ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports) {

// mobile only stuff

/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.5.0
Child mobile:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset      Size  Chunks             Chunk Names
    mobile.js  3.04 KiB       0  [emitted]  main
    Entrypoint main = mobile.js
    chunk    {0} mobile.js (main) 117 bytes [entry] [rendered]
        > ./example main
        [0] ./example.js 97 bytes {0} [built]
            single entry ./example  main
        [1] ./mobile-stuff.js 20 bytes {0} [built]
            cjs require ./mobile-stuff [0] ./example.js 2:1-26
Child desktop:
    Hash: 0a1b2c3d4e5f6a7b8c9d
         Asset     Size  Chunks             Chunk Names
    desktop.js  2.8 KiB       0  [emitted]  main
    Entrypoint main = desktop.js
    chunk    {0} desktop.js (main) 97 bytes [entry] [rendered]
        > ./example main
        [0] ./example.js 97 bytes {0} [built]
            single entry ./example  main
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.5.0
Child mobile:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset       Size  Chunks             Chunk Names
    mobile.js  608 bytes       0  [emitted]  main
    Entrypoint main = mobile.js
    chunk    {0} mobile.js (main) 117 bytes [entry] [rendered]
        > ./example main
        [0] ./mobile-stuff.js 20 bytes {0} [built]
            cjs require ./mobile-stuff [1] ./example.js 2:1-26
        [1] ./example.js 97 bytes {0} [built]
            single entry ./example  main
Child desktop:
    Hash: 0a1b2c3d4e5f6a7b8c9d
         Asset       Size  Chunks             Chunk Names
    desktop.js  588 bytes       0  [emitted]  main
    Entrypoint main = desktop.js
    chunk    {0} desktop.js (main) 97 bytes [entry] [rendered]
        > ./example main
        [0] ./example.js 97 bytes {0} [built]
            single entry ./example  main
```