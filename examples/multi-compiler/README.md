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
if(true) {
	__webpack_require__(1);
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
  asset mobile.js 1.22 KiB [emitted] (name: main)
  ./example.js 94 bytes [built] [code generated]
  ./mobile-stuff.js 20 bytes [built] [code generated]
  mobile (webpack 5.4.0) compiled successfully

desktop:
  asset desktop.js 114 bytes [emitted] (name: main)
  ./example.js 94 bytes [built] [code generated]
  desktop (webpack 5.4.0) compiled successfully
```

## Production mode

```
mobile:
  asset mobile.js 181 bytes [emitted] [minimized] (name: main)
  ./example.js 94 bytes [built] [code generated]
  ./mobile-stuff.js 20 bytes [built] [code generated]
  mobile (webpack 5.4.0) compiled successfully

desktop:
  asset desktop.js 37 bytes [emitted] [minimized] (name: main)
  ./example.js 94 bytes [built] [code generated]
  desktop (webpack 5.4.0) compiled successfully
```
