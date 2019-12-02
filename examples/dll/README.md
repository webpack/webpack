# DllReference

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

This is the _reference_ bundle (with the manifests) for [dll user example](https://github.com/webpack/webpack/tree/master/examples/dll-user)

# webpack.config.js

```javascript
var path = require("path");
var webpack = require("../../");
module.exports = {
	// mode: "development || "production",
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
```

# dist/MyDll.alpha.js

```javascript
var alpha_dcd111488d58f7509919 =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!*****************!*\
  !*** dll alpha ***!
  \*****************/
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_require__, module */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!******************!*\
  !*** ./alpha.js ***!
  \******************/
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "alpha";

/***/ }),
/* 2 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "a";

/***/ }),
/* 3 */
/*!*********************************!*\
  !*** ../node_modules/module.js ***!
  \*********************************/
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
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
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })()
;
```

# dist/alpha-manifest.json

```javascript
{"name":"alpha_dcd111488d58f7509919","content":{"./alpha.js":{"id":1,"buildMeta":{}},"./a.js":{"id":2,"buildMeta":{}},"../node_modules/module.js":{"id":3,"buildMeta":{}}}}
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
         Asset      Size
MyDll.alpha.js  2.44 KiB  [emitted]  [name: alpha]
 MyDll.beta.js  2.41 KiB  [emitted]  [name: beta]
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha
 ../node_modules/module.js 26 bytes [built]
     entry module dll alpha alpha[2]
     DllPlugin
 ./a.js 21 bytes [built]
     entry ./a dll alpha alpha[1]
     DllPlugin
 ./alpha.js 25 bytes [built]
     entry ./alpha dll alpha alpha[0]
     DllPlugin
 dll alpha 12 bytes [built]
     dll entry
     used a library export
     DllPlugin
chunk MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta
 ./b.js 21 bytes [built]
     entry ./b dll beta beta[1]
     DllPlugin
 ./beta.js 24 bytes [built]
     entry ./beta dll beta beta[0]
     DllPlugin
 ./c.jsx 23 bytes [built]
     entry ./c dll beta beta[2]
     DllPlugin
 dll beta 12 bytes [built]
     dll entry
     used a library export
     DllPlugin
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
         Asset       Size
MyDll.alpha.js  291 bytes  [emitted]  [name: alpha]
 MyDll.beta.js  282 bytes  [emitted]  [name: beta]
Entrypoint alpha = MyDll.alpha.js
Entrypoint beta = MyDll.beta.js
chunk MyDll.alpha.js (alpha) 84 bytes [entry] [rendered]
    > alpha
 ../node_modules/module.js 26 bytes [built]
     entry module dll alpha alpha[2]
     DllPlugin
 ./a.js 21 bytes [built]
     entry ./a dll alpha alpha[1]
     DllPlugin
 ./alpha.js 25 bytes [built]
     entry ./alpha dll alpha alpha[0]
     DllPlugin
 dll alpha 12 bytes [built]
     dll entry
     used a library export
     DllPlugin
chunk MyDll.beta.js (beta) 80 bytes [entry] [rendered]
    > beta
 ./b.js 21 bytes [built]
     entry ./b dll beta beta[1]
     DllPlugin
 ./beta.js 24 bytes [built]
     entry ./beta dll beta beta[0]
     DllPlugin
 ./c.jsx 23 bytes [built]
     entry ./c dll beta beta[2]
     DllPlugin
 dll beta 12 bytes [built]
     dll entry
     used a library export
     DllPlugin
```
