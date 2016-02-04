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

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules, executeModule) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(resolves.length)
/******/ 			resolves.shift()();
/******/ 		if(executeModule + 1) { // typeof executeModule === "number"
/******/ 			return __webpack_require__(executeModule);
/******/ 		}
/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		1: 0
/******/ 	};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}

/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return Promise.resolve()

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
/******/ 		head.appendChild(script);

/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		return installedChunks[chunkId][2] = promise;
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { throw err; };
/******/ })
/************************************************************************/
/******/ ([
/* 0 */,
/* 1 */
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
webpackJsonp([3],{

/***/ 2:
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	var common = __webpack_require__(/*! ./common */ 1);
	__webpack_require__.e/* require */(0).catch(function(err) { __webpack_require__.oe(err); }).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./shared */ 0)]; (function(shared) {
		shared("This is page A");
	}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));});

/***/ }

},[2]);
```

# js/pageB.bundle.js

``` javascript
webpackJsonp([2],{

/***/ 3:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	var common = __webpack_require__(/*! ./common */ 1);
	__webpack_require__.e/* nsure */(0/* duplicate */).catch(function(err) { __webpack_require__.oe(err); }).then(function(require) {
		var shared = __webpack_require__(/*! ./shared */ 0);
		shared("This is page B");
	}.bind(null, __webpack_require__));

/***/ }

},[3]);
```

# js/0.chunk.js

``` javascript
webpackJsonp([0],[
/* 0 */
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
Hash: 4f116ebe8131ab16cf5a
Version: webpack 2.0.6-beta
Time: 70ms
          Asset       Size  Chunks             Chunk Names
     0.chunk.js  284 bytes       0  [emitted]  
     commons.js    4.27 kB       1  [emitted]  commons
pageB.bundle.js  482 bytes       2  [emitted]  pageB
pageA.bundle.js  518 bytes       3  [emitted]  pageA
chunk    {0} 0.chunk.js 91 bytes {3} {2} [rendered]
    > [2] ./pageA.js 2:0-4:2
    > duplicate [3] ./pageB.js 2:0-5:2
    [0] ./shared.js 91 bytes {0} [built]
        amd require ./shared [2] ./pageA.js 2:0-4:2
        require.ensure item ./shared [3] ./pageB.js 2:0-5:2
        cjs require ./shared [3] ./pageB.js 3:14-33
chunk    {1} commons.js (commons) 26 bytes [rendered]
    [1] ./common.js 26 bytes {1} [built]
        cjs require ./common [0] ./shared.js 1:13-32
        cjs require ./common [2] ./pageA.js 1:13-32
        cjs require ./common [3] ./pageB.js 1:13-32
chunk    {2} pageB.bundle.js (pageB) 152 bytes {1} [rendered]
    > pageB [3] ./pageB.js 
    [3] ./pageB.js 152 bytes {2} [built]
chunk    {3} pageA.bundle.js (pageA) 108 bytes {1} [rendered]
    > pageA [2] ./pageA.js 
    [2] ./pageA.js 108 bytes {3} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 4f116ebe8131ab16cf5a
Version: webpack 2.0.6-beta
Time: 216ms
          Asset       Size  Chunks             Chunk Names
     0.chunk.js   80 bytes       0  [emitted]  
     commons.js  992 bytes       1  [emitted]  commons
pageB.bundle.js  149 bytes       2  [emitted]  pageB
pageA.bundle.js  166 bytes       3  [emitted]  pageA
chunk    {0} 0.chunk.js 91 bytes {3} {2} [rendered]
    > [2] ./pageA.js 2:0-4:2
    > duplicate [3] ./pageB.js 2:0-5:2
    [0] ./shared.js 91 bytes {0} [built]
        amd require ./shared [2] ./pageA.js 2:0-4:2
        require.ensure item ./shared [3] ./pageB.js 2:0-5:2
        cjs require ./shared [3] ./pageB.js 3:14-33
chunk    {1} commons.js (commons) 26 bytes [rendered]
    [1] ./common.js 26 bytes {1} [built]
        cjs require ./common [0] ./shared.js 1:13-32
        cjs require ./common [2] ./pageA.js 1:13-32
        cjs require ./common [3] ./pageB.js 1:13-32
chunk    {2} pageB.bundle.js (pageB) 152 bytes {1} [rendered]
    > pageB [3] ./pageB.js 
    [3] ./pageB.js 152 bytes {2} [built]
chunk    {3} pageA.bundle.js (pageA) 108 bytes {1} [rendered]
    > pageA [2] ./pageA.js 
    [2] ./pageA.js 108 bytes {3} [built]

WARNING in 0.chunk.js from UglifyJs
Side effects in initialization of unused variable common [./shared.js:1,0]

WARNING in pageB.bundle.js from UglifyJs
Side effects in initialization of unused variable common [./pageB.js:1,0]

WARNING in pageA.bundle.js from UglifyJs
Side effects in initialization of unused variable common [./pageA.js:1,0]
```
