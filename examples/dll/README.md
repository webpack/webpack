# DllReference

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

This is the _reference_ bundle (with the manifests) for [dll user example](https://github.com/webpack/webpack/tree/main/examples/dll-user)

# webpack.config.js

```javascript
"use strict";

const path = require("path");
const webpack = require("../../");

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
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
		library: "[name]_[fullhash]"
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "dist", "[name]-manifest.json"),
			name: "[name]_[fullhash]"
		})
	]
};

module.exports = config;
```

# dist/MyDll.alpha.js

```javascript
var alpha_25a3e61d8022ff6ebe7a;
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!*****************!*\
  !*** dll alpha ***!
  \*****************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__, module */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!******************!*\
  !*** ./alpha.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = "alpha";

/***/ }),
/* 2 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = "a";

/***/ }),
/* 3 */
/*!*********************************!*\
  !*** ../node_modules/module.js ***!
  \*********************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = "module";


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
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
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
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module doesn't tell about it's top-level declarations so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	alpha_25a3e61d8022ff6ebe7a = __webpack_exports__;
/******/ 	
/******/ })()
;
```

# dist/alpha-manifest.json

```javascript
{"name":"alpha_25a3e61d8022ff6ebe7a","content":{"./alpha.js":{"id":1,"buildMeta":{"treatAsCommonJs":true}},"./a.js":{"id":2,"buildMeta":{"treatAsCommonJs":true}},"../node_modules/module.js":{"id":3,"buildMeta":{"treatAsCommonJs":true}}}}
```

# Info

## Unoptimized

```
asset MyDll.alpha.js 2.83 KiB [emitted] (name: alpha)
asset MyDll.beta.js 2.8 KiB [emitted] (name: beta)
cacheable modules 144 bytes
  modules by path ./*.js 91 bytes
    ./alpha.js 25 bytes [built] [code generated]
    ./a.js 21 bytes [built] [code generated]
    ./beta.js 24 bytes [built] [code generated]
    ./b.js 21 bytes [built] [code generated]
  ../node_modules/module.js 28 bytes [built] [code generated]
  ./c.jsx 25 bytes [built] [code generated]
dll alpha 12 bytes [built] [code generated]
dll beta 12 bytes [built] [code generated]
webpack X.X.X compiled successfully
```

## Production mode

```
asset MyDll.alpha.js 307 bytes [emitted] [minimized] (name: alpha)
asset MyDll.beta.js 301 bytes [emitted] [minimized] (name: beta)
cacheable modules 144 bytes
  modules by path ./*.js 91 bytes
    ./alpha.js 25 bytes [built] [code generated]
    ./a.js 21 bytes [built] [code generated]
    ./beta.js 24 bytes [built] [code generated]
    ./b.js 21 bytes [built] [code generated]
  ../node_modules/module.js 28 bytes [built] [code generated]
  ./c.jsx 25 bytes [built] [code generated]
dll alpha 12 bytes [built] [code generated]
dll beta 12 bytes [built] [code generated]
webpack X.X.X compiled successfully
```
