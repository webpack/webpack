This example shows how to use multiple entry points with a commons chunk.

In this example you have two (HTML) pages `pageA` and `pageB`. You want to create individual bundles for each page. In addition to this you want to create a shared bundle that contains all modules used in both pages (assuming there are many/big modules in common). The pages also use Code Splitting to load a less used part of the features on demand.

You can see how to define multiple entry points via the `entry` option and the required changes (`[name]`) in the `output` option. You can also see how to use the CommonsChunkPlugin.

You can see the output files:

* `commons.js` contains:
  * the module system
  * chunk loading logic
  * module `common.js` which is used in both pages
* `pageA.bundle.js` contains: (`pageB.bundle.js` is similar)
  * the entry point `pageA.js`
  * it would contain any other module that is only used by `pageA`
* `0.chunk.js` is an additional chunk which is used by both pages. It contains:
  * module `shared.js`

You can also see the info that is printed to console. It shows among others:

* the generated files
* the chunks with file, name and id
  * see lines starting with `chunk`
* the modules that are in the chunks
* the reasons why the modules are included
* the reasons why a chunk is created
  * see lines starting with `>`

# pageA.js

``` javascript
var common = require("./common");
require(["./shared"], function(shared) {
	shared("This is page A");
});
```

# pageB.js

``` javascript
var common = require("./common");
require.ensure(["./shared"], function(require) {
	var shared = require("./shared");
	shared("This is page B");
});
```

# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		pageA: "./pageA",
		pageB: "./pageB"
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].bundle.js",
		chunkFilename: "[id].chunk.js"
	},
	plugins: [
		new CommonsChunkPlugin({
			filename: "commons.js",
			name: "commons"
		})
	]
}
```

# pageA.html

``` html
<html>
	<head></head>
	<body>
		<script src="js/commons.js" charset="utf-8"></script>
		<script src="js/pageA.bundle.js" charset="utf-8"></script>
	</body>
</html>
```

# js/commons.js

<details><summary>`/******/ (function(modules) { /* webpackBootstrap */ })`</summary>
``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules, executeModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [], result;
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules, executeModules);
/******/ 		while(resolves.length)
/******/ 			resolves.shift()();
/******/ 		if(executeModules) {
/******/ 			for(i=0; i < executeModules.length; i++) {
/******/ 				result = __webpack_require__(__webpack_require__.s = executeModules[i]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		3: 0
/******/ 	};

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

/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return Promise.resolve();

/******/ 		// an Promise means "currently loading".
/******/ 		if(installedChunks[chunkId]) {
/******/ 			return installedChunks[chunkId][2];
/******/ 		}
/******/ 		// start chunk loading
/******/ 		var head = document.getElementsByTagName('head')[0];
/******/ 		var script = document.createElement('script');
/******/ 		script.type = 'text/javascript';
/******/ 		script.charset = 'utf-8';
/******/ 		script.async = true;
/******/ 		script.timeout = 120000;

/******/ 		if (__webpack_require__.nc) {
/******/ 			script.setAttribute("nonce", __webpack_require__.nc);
/******/ 		}
/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".chunk.js";
/******/ 		var timeout = setTimeout(onScriptComplete, 120000);
/******/ 		script.onerror = script.onload = onScriptComplete;
/******/ 		function onScriptComplete() {
/******/ 			// avoid mem leaks in IE.
/******/ 			script.onerror = script.onload = null;
/******/ 			clearTimeout(timeout);
/******/ 			var chunk = installedChunks[chunkId];
/******/ 			if(chunk !== 0) {
/******/ 				if(chunk) chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));
/******/ 				installedChunks[chunkId] = undefined;
/******/ 			}
/******/ 		};

/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		installedChunks[chunkId][2] = promise;

/******/ 		head.appendChild(script);
/******/ 		return promise;
/******/ 	};

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

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ([
/* 0 */,
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!*******************!*\
  !*** ./common.js ***!
  \*******************/
/***/ function(module, exports) {

module.exports = "Common";

/***/ }
/******/ ]);
```

# js/pageA.bundle.js

``` javascript
webpackJsonp([2],{

/***/ 2:
/* unknown exports provided */
/* all exports used */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

var common = __webpack_require__(/*! ./common */ 1);
__webpack_require__.e/* require */(0).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./shared */ 0)]; (function(shared) {
	shared("This is page A");
}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}).catch(__webpack_require__.oe);

/***/ }

},[2]);
```

# js/pageB.bundle.js

``` javascript
webpackJsonp([1],{

/***/ 3:
/* unknown exports provided */
/* all exports used */
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

var common = __webpack_require__(/*! ./common */ 1);
__webpack_require__.e/* require.ensure */(0/* duplicate */).then((function(require) {
	var shared = __webpack_require__(/*! ./shared */ 0);
	shared("This is page B");
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

/***/ }

},[3]);
```

# js/0.chunk.js

``` javascript
webpackJsonp([0],[
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!*******************!*\
  !*** ./shared.js ***!
  \*******************/
/***/ function(module, exports, __webpack_require__) {

var common = __webpack_require__(/*! ./common */ 1);
module.exports = function(msg) {
	console.log(msg);
};

/***/ }
]);
```

# Info

## Uncompressed

```
Hash: 8ccc79cdf2183770dc18
Version: webpack 2.2.0-rc.2
          Asset       Size  Chunks             Chunk Names
     0.chunk.js  334 bytes       0  [emitted]  
pageB.bundle.js  518 bytes       1  [emitted]  pageB
pageA.bundle.js  544 bytes       2  [emitted]  pageA
     commons.js    5.78 kB       3  [emitted]  commons
Entrypoint pageA = commons.js pageA.bundle.js
Entrypoint pageB = commons.js pageB.bundle.js
chunk    {0} 0.chunk.js 91 bytes {1} {2} [rendered]
    > duplicate [2] ./pageA.js 2:0-4:2
    > duplicate [3] ./pageB.js 2:0-5:2
    [0] ./shared.js 91 bytes {0} [built]
        amd require ./shared [2] ./pageA.js 2:0-4:2
        require.ensure item ./shared [3] ./pageB.js 2:0-5:2
        cjs require ./shared [3] ./pageB.js 3:14-33
chunk    {1} pageB.bundle.js (pageB) 152 bytes {3} [initial] [rendered]
    > pageB [3] ./pageB.js 
    [3] ./pageB.js 152 bytes {1} [built]
chunk    {2} pageA.bundle.js (pageA) 108 bytes {3} [initial] [rendered]
    > pageA [2] ./pageA.js 
    [2] ./pageA.js 108 bytes {2} [built]
chunk    {3} commons.js (commons) 26 bytes [entry] [rendered]
    [1] ./common.js 26 bytes {3} [built]
        cjs require ./common [0] ./shared.js 1:13-32
        cjs require ./common [2] ./pageA.js 1:13-32
        cjs require ./common [3] ./pageB.js 1:13-32
```

## Minimized (uglify-js, no zip)

```
Hash: 8ccc79cdf2183770dc18
Version: webpack 2.2.0-rc.2
          Asset       Size  Chunks             Chunk Names
     0.chunk.js   80 bytes       0  [emitted]  
pageB.bundle.js  130 bytes       1  [emitted]  pageB
pageA.bundle.js  147 bytes       2  [emitted]  pageA
     commons.js    1.41 kB       3  [emitted]  commons
Entrypoint pageA = commons.js pageA.bundle.js
Entrypoint pageB = commons.js pageB.bundle.js
chunk    {0} 0.chunk.js 91 bytes {1} {2} [rendered]
    > duplicate [2] ./pageA.js 2:0-4:2
    > duplicate [3] ./pageB.js 2:0-5:2
    [0] ./shared.js 91 bytes {0} [built]
        amd require ./shared [2] ./pageA.js 2:0-4:2
        require.ensure item ./shared [3] ./pageB.js 2:0-5:2
        cjs require ./shared [3] ./pageB.js 3:14-33
chunk    {1} pageB.bundle.js (pageB) 152 bytes {3} [initial] [rendered]
    > pageB [3] ./pageB.js 
    [3] ./pageB.js 152 bytes {1} [built]
chunk    {2} pageA.bundle.js (pageA) 108 bytes {3} [initial] [rendered]
    > pageA [2] ./pageA.js 
    [2] ./pageA.js 108 bytes {2} [built]
chunk    {3} commons.js (commons) 26 bytes [entry] [rendered]
    [1] ./common.js 26 bytes {3} [built]
        cjs require ./common [0] ./shared.js 1:13-32
        cjs require ./common [2] ./pageA.js 1:13-32
        cjs require ./common [3] ./pageB.js 1:13-32
```
