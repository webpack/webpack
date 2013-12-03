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
		chunkFilename: "[id].chunk.js",
		namedChunkFilename: "[name].chunk.js"
	},
	plugins: [
		new CommonsChunkPlugin("commons")
	]
}
```

# pageA.html

``` html
<html>
	<head></head>
	<body>
		<script src="js/commons.bundle.js" charset="utf-8"></script>
		<script src="js/pageA.chunk.js" charset="utf-8"></script>
	</body>
</html>
```

# js/commons.bundle.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {0:[function(require){require(0);}]};
/******/ 	
/******/ 	// The require function
/******/ 	function require(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/ 		
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/ 		
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, require);
/******/ 		
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 		
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	require.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, require);
/******/ 		
/******/ 		// an array means "currently loading".
/******/ 		if(installedChunks[chunkId] !== undefined) {
/******/ 			installedChunks[chunkId].push(callback);
/******/ 		} else {
/******/ 			// start chunk loading
/******/ 			installedChunks[chunkId] = [callback];
/******/ 			var head = document.getElementsByTagName('head')[0];
/******/ 			var script = document.createElement('script');
/******/ 			script.type = 'text/javascript';
/******/ 			script.charset = 'utf-8';
/******/ 			script.src = modules.c + "" + chunkId + ".chunk.js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	require.modules = modules;
/******/ 	
/******/ 	// expose the module cache
/******/ 	require.cache = installedModules;
/******/ 	
/******/ 	// install a JSONP callback for chunk loading
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, callbacks = [];
/******/ 		while(chunkIds.length) {
/******/ 			chunkId = chunkIds.shift();
/******/ 			if(installedChunks[chunkId])
/******/ 				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, require);
/******/ 	};
/******/ })
/************************************************************************/
/******/ ({
/******/ // __webpack_public_path__
/******/ c: "",

/***/ 1:
/*!*******************!*\
  !*** ./common.js ***!
  \*******************/
/***/ function(module, exports, require) {

	module.exports = "Common";

/***/ }
/******/ })
```

# js/pageA.chunk.js

``` javascript
webpackJsonp([0],
{

/***/ 0:
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports, require) {

	var common = require(/*! ./common */ 1);
	require.e/* require */(1/* duplicate */, function(require) { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [(require(/*! ./shared */ 2))]; (function(shared) {
		shared("This is page A");
	}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));});

/***/ }

}
)
```

# js/pageB.chunk.js

``` javascript
webpackJsonp([0],
{

/***/ 0:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/***/ function(module, exports, require) {

	var common = require(/*! ./common */ 1);
	require.e/*nsure*/(1, function(require) {
		var shared = require(/*! ./shared */ 2);
		shared("This is page B");
	});

/***/ }

}
)
```

# js/1.chunk.js

``` javascript
webpackJsonp([1],
{

/***/ 2:
/*!*******************!*\
  !*** ./shared.js ***!
  \*******************/
/***/ function(module, exports, require) {

	module.exports = function(msg) {
		console.log(msg);
	};

/***/ }

}
)
```

# Info

## Uncompressed

```
Hash: 5c54ce5e4829d6200e83
Version: webpack 0.11.9
Time: 51ms
            Asset  Size  Chunks             Chunk Names
   pageB.chunk.js   323       0  [emitted]  pageB      
   pageA.chunk.js   432       0  [emitted]  pageA      
commons.bundle.js  3389       0  [emitted]  commons    
       1.chunk.js   219       1  [emitted]             
chunk    {0} pageB.chunk.js (pageB) 152 {0} [rendered]
    [0] ./pageB.js 152 {0} [built]
chunk    {0} pageA.chunk.js (pageA) 108 {0} [rendered]
    [0] ./pageA.js 108 {0} [built]
chunk    {0} commons.bundle.js (commons) 26 [rendered]
    [1] ./common.js 26 {0} [built]
        cjs require ./common [0] ./pageA.js 1:13-32
        cjs require ./common [0] ./pageB.js 1:13-32
chunk    {1} 1.chunk.js 54 {0} {0} [rendered]
    [2] ./shared.js 54 {1} [built]
        amd require ./shared [0] ./pageA.js 2:0-4:2
        require.ensure item ./shared [0] ./pageB.js 2:0-5:2
        cjs require ./shared [0] ./pageB.js 3:14-33
```

## Minimized (uglify-js, no zip)

```
Hash: 26bb5b48d267eb86b55c
Version: webpack 0.11.9
Time: 125ms
            Asset  Size  Chunks             Chunk Names
   pageB.chunk.js    95       0  [emitted]  pageB      
   pageA.chunk.js   126       0  [emitted]  pageA      
commons.bundle.js   692       0  [emitted]  commons    
       1.chunk.js    73       1  [emitted]             
chunk    {0} pageB.chunk.js (pageB) 152 {0} [rendered]
    [0] ./pageB.js 152 {0} [built]
chunk    {0} pageA.chunk.js (pageA) 108 {0} [rendered]
    [0] ./pageA.js 108 {0} [built]
chunk    {0} commons.bundle.js (commons) 26 [rendered]
    [1] ./common.js 26 {0} [built]
        cjs require ./common [0] ./pageB.js 1:13-32
        cjs require ./common [0] ./pageA.js 1:13-32
chunk    {1} 1.chunk.js 54 {0} {0} [rendered]
    [2] ./shared.js 54 {1} [built]
        require.ensure item ./shared [0] ./pageB.js 2:0-5:2
        cjs require ./shared [0] ./pageB.js 3:14-33
        amd require ./shared [0] ./pageA.js 2:0-4:2

WARNING in pageB.chunk.js from UglifyJs
Side effects in initialization of unused variable common [./pageB.js:1,0]

WARNING in pageA.chunk.js from UglifyJs
Side effects in initialization of unused variable common [./pageA.js:1,0]
```
