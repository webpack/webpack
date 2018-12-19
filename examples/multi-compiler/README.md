
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
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
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
/*! runtime requirements:  */
/***/ (function() {

if(false) {}
console.log("Running " + "desktop" + " build");

/***/ })
/******/ ]);
```

# dist/mobile.js

``` javascript
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
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

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
/*! runtime requirements:  */
/***/ (function() {

// mobile only stuff

/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
Child mobile:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset     Size  Chunks             Chunk Names
    mobile.js  1.7 KiB     {0}  [emitted]  main
    Entrypoint main = mobile.js
    chunk {0} mobile.js (main) 114 bytes [entry] [rendered]
        > ./example main
     [0] ./example.js 94 bytes {0} [built]
         [used exports unknown]
         entry ./example main
     [1] ./mobile-stuff.js 20 bytes {0} [built]
         [used exports unknown]
         cjs require ./mobile-stuff [0] ./example.js 2:1-26
Child desktop:
    Hash: 0a1b2c3d4e5f6a7b8c9d
         Asset      Size  Chunks             Chunk Names
    desktop.js  1.38 KiB     {0}  [emitted]  main
    Entrypoint main = desktop.js
    chunk {0} desktop.js (main) 94 bytes [entry] [rendered]
        > ./example main
     [0] ./example.js 94 bytes {0} [built]
         [used exports unknown]
         entry ./example main
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
Child mobile:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset       Size  Chunks             Chunk Names
    mobile.js  264 bytes   {404}  [emitted]  main
    Entrypoint main = mobile.js
    chunk {404} mobile.js (main) 114 bytes [entry] [rendered]
        > ./example main
     [273] ./mobile-stuff.js 20 bytes {404} [built]
           cjs require ./mobile-stuff [275] ./example.js 2:1-26
     [275] ./example.js 94 bytes {404} [built]
           entry ./example main
Child desktop:
    Hash: 0a1b2c3d4e5f6a7b8c9d
         Asset       Size  Chunks             Chunk Names
    desktop.js  236 bytes   {404}  [emitted]  main
    Entrypoint main = desktop.js
    chunk {404} desktop.js (main) 94 bytes [entry] [rendered]
        > ./example main
     [275] ./example.js 94 bytes {404} [built]
           entry ./example main
```