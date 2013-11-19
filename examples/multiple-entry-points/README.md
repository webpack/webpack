# pageA.js

``` javascript
require(["./shared"], function(shared) {
	shared("This is page A");
});
```

# pageB.js

``` javascript
require.ensure(["./shared"], function(require) {
	var shared = require("./shared");
	shared("This is page B");
});
```

# webpack.config.js

``` javascript
var path = require("path");
module.exports = {
	entry: {
		pageA: "./pageA",
		pageB: "./pageB"
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].bundle.js",
		chunkFilename: "[id].chunk.js"
	}
}
```

# js/pageA.bundle.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {0:0};
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
/******/ 	
/******/ 	// Load entry module and return exports
/******/ 	return require(0);
/******/ })
/************************************************************************/
/******/ ({
/******/ // __webpack_public_path__
/******/ c: "",

/***/ 0:
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports, require) {

	require.e/* require */(1, function(require) { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [(require(/*! ./shared */ 1))]; (function(shared) {
		shared("This is page A");
	}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));});

/***/ }
/******/ })
```

# js/pageB.bundle.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {0:0};
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
/******/ 	
/******/ 	// Load entry module and return exports
/******/ 	return require(0);
/******/ })
/************************************************************************/
/******/ ({
/******/ // __webpack_public_path__
/******/ c: "",

/***/ 0:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/***/ function(module, exports, require) {

	require.e/*nsure*/(1/* duplicate */, function(require) {
		var shared = require(/*! ./shared */ 1);
		shared("This is page B");
	});

/***/ }
/******/ })
```

# js/1.chunk.js

``` javascript
webpackJsonp([1],
{

/***/ 1:
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
Hash: 5a0cf79fbce895020932
Version: webpack 0.11.6
Time: 47ms
          Asset  Size  Chunks             Chunk Names
pageB.bundle.js  3551       0  [emitted]  pageB      
pageA.bundle.js  3631       0  [emitted]  pageA      
     1.chunk.js   219       1  [emitted]             
chunk    {0} pageB.bundle.js (pageB) 114 [rendered]
    [0] ./pageB.js 114 {0} [built]
chunk    {0} pageA.bundle.js (pageA) 71 [rendered]
    [0] ./pageA.js 71 {0} [built]
chunk    {1} 1.chunk.js 54 {0} {0} [rendered]
    [1] ./shared.js 54 {1} [built]
        require.ensure item ./shared [0] ./pageB.js 1:0-4:2
        cjs require ./shared [0] ./pageB.js 2:14-33
        amd require ./shared [0] ./pageA.js 1:0-3:2
```

## Minimized (uglify-js, no zip)

```
Hash: 19a8355b8a970c621db3
Version: webpack 0.11.6
Time: 168ms
          Asset  Size  Chunks             Chunk Names
pageB.bundle.js   722       0  [emitted]  pageB      
pageA.bundle.js   753       0  [emitted]  pageA      
     1.chunk.js    73       1  [emitted]             
chunk    {0} pageB.bundle.js (pageB) 114 [rendered]
    [0] ./pageB.js 114 {0} [built]
chunk    {0} pageA.bundle.js (pageA) 71 [rendered]
    [0] ./pageA.js 71 {0} [built]
chunk    {1} 1.chunk.js 54 {0} {0} [rendered]
    [1] ./shared.js 54 {1} [built]
        require.ensure item ./shared [0] ./pageB.js 1:0-4:2
        cjs require ./shared [0] ./pageB.js 2:14-33
        amd require ./shared [0] ./pageA.js 1:0-3:2
```
