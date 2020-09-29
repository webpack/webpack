# example.js

```javascript
if(ENV === "mobile") {
	require("./mobile-stuff");
}
console.log("Running " + ENV + " build");
```

# webpack.config.js

```javascript
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

```javascript
/******/ (() => { // webpackBootstrap
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
if(false) {}
console.log("Running " + "desktop" + " build");
/******/ })()
;
```

# dist/mobile.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!*************************!*\
  !*** ./mobile-stuff.js ***!
  \*************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
/***/ (() => {

// mobile only stuff

/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
```

</details>

``` js
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__ */
if(true) {
	__webpack_require__(/*! ./mobile-stuff */ 1);
}
console.log("Running " + "mobile" + " build");
})();

/******/ })()
;
```

# Info

## Unoptimized

```
mobile:
  asset mobile.js 1.57 KiB [emitted] (name: main)
  chunk mobile.js (main) 114 bytes [entry] [rendered]
    > ./example main
    dependent modules 20 bytes [dependent] 1 module
    ./example.js 94 bytes [built] [code generated]
      [used exports unknown]
      entry ./example main
  mobile (webpack 5.0.0-beta.32) compiled successfully

desktop:
  asset desktop.js 262 bytes [emitted] (name: main)
  chunk desktop.js (main) 94 bytes [entry] [rendered]
    > ./example main
    ./example.js 94 bytes [built] [code generated]
      [used exports unknown]
      entry ./example main
  desktop (webpack 5.0.0-beta.32) compiled successfully
```

## Production mode

```
mobile:
  asset mobile.js 181 bytes [emitted] [minimized] (name: main)
  chunk (runtime: main) mobile.js (main) 114 bytes [entry] [rendered]
    > ./example main
    dependent modules 20 bytes [dependent] 1 module
    ./example.js 94 bytes [built] [code generated]
      [no exports used]
      entry ./example main
  mobile (webpack 5.0.0-beta.32) compiled successfully

desktop:
  asset desktop.js 37 bytes [emitted] [minimized] (name: main)
  chunk (runtime: main) desktop.js (main) 94 bytes [entry] [rendered]
    > ./example main
    ./example.js 94 bytes [built] [code generated]
      [no exports used]
      entry ./example main
  desktop (webpack 5.0.0-beta.32) compiled successfully
```
