
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
		entry: "./example",
		output: {
			path: path.join(__dirname, "js"),
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
		entry: "./example",
		output: {
			path: path.join(__dirname, "js"),
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

# js/desktop.js

<details><summary>`/******/ (function(modules) { /* webpackBootstrap */ })`</summary>
``` javascript
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
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

if(false) {
	require("./mobile-stuff");
}
console.log("Running " + "desktop" + " build");

/***/ }
/******/ ]);
```

# js/mobile.js

``` javascript
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
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!*************************!*\
  !*** ./mobile-stuff.js ***!
  \*************************/
/***/ function(module, exports) {

// mobile only stuff

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

if(true) {
	__webpack_require__(/*! ./mobile-stuff */ 0);
}
console.log("Running " + "mobile" + " build");

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 13bf2527439f032e7491cceba4bc5163d755f291
Version: webpack 2.2.0-rc.2
Child mobile:
    Hash: 13bf2527439f032e7491
    Version: webpack 2.2.0-rc.2
        Asset     Size  Chunks             Chunk Names
    mobile.js  2.99 kB       0  [emitted]  main
    Entrypoint main = mobile.js
    chunk    {0} mobile.js (main) 117 bytes [entry] [rendered]
        > main [1] ./example.js 
        [0] ./mobile-stuff.js 20 bytes {0} [built]
            cjs require ./mobile-stuff [1] ./example.js 2:1-26
        [1] ./example.js 97 bytes {0} [built]
Child desktop:
    Hash: cceba4bc5163d755f291
    Version: webpack 2.2.0-rc.2
         Asset     Size  Chunks             Chunk Names
    desktop.js  2.75 kB       0  [emitted]  main
    Entrypoint main = desktop.js
    chunk    {0} desktop.js (main) 97 bytes [entry] [rendered]
        > main [0] ./example.js 
        [0] ./example.js 97 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 13bf2527439f032e7491cceba4bc5163d755f291
Version: webpack 2.2.0-rc.2
Child mobile:
    Hash: 13bf2527439f032e7491
    Version: webpack 2.2.0-rc.2
        Asset       Size  Chunks             Chunk Names
    mobile.js  573 bytes       0  [emitted]  main
    Entrypoint main = mobile.js
    chunk    {0} mobile.js (main) 117 bytes [entry] [rendered]
        > main [1] ./example.js 
        [0] ./mobile-stuff.js 20 bytes {0} [built]
            cjs require ./mobile-stuff [1] ./example.js 2:1-26
        [1] ./example.js 97 bytes {0} [built]
Child desktop:
    Hash: cceba4bc5163d755f291
    Version: webpack 2.2.0-rc.2
         Asset       Size  Chunks             Chunk Names
    desktop.js  553 bytes       0  [emitted]  main
    Entrypoint main = desktop.js
    chunk    {0} desktop.js (main) 97 bytes [entry] [rendered]
        > main [0] ./example.js 
        [0] ./example.js 97 bytes {0} [built]
```