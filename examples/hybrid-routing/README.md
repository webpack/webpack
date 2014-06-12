# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		// The entry points for the pages
		pageA: "./aEntry",
		pageB: "./bEntry",

		// This file contains common modules but also the router entry
		"commons.js": "./router"
	},
	output: {
		path: path.join(__dirname, "js"),
		publicPath: 'js/',
		filename: "[name].bundle.js",
		chunkFilename: "[id].chunk.js"
	},
	plugins: [
		// Extract common modules from the entries to the commons.js file
		// This is optional, but good for performance.
		new CommonsChunkPlugin("commons.js")
		// The pages cannot run without the commons.js file now.
	]
}
```

# aEntry.js

``` javascript
// Just show the page "a"
var render = require("./render");
render(require("./aPage"));
```

`bEntry.js` is similar. You may want to use a loader to generate this file.

# aPage.js

``` javascript
module.exports = function() {
	return "This is page A.";
};
```

`bEntry.js` is similar.

# router.js

``` javascript
var render = require("./render");

// Event when another page should be opened
// Maybe hook click on links, hashchange or popstate
window.onLinkToPage = function onLinkToPage(name) { // name is "a" or "b"
	// require the page with a dynamic require

	// It's important that this require only matches the pages
	//  elsewise there is blood in the bundle. Here this is done with a
	//  specific file prefix. It's also possible to use a directory,
	//  overwriting the RegExp with the ContextReplacementPlugin, or
	//  using the require.context method.

	// The bundle-loader is used to create a chunk from the page
	//  -> Pages are only loaded on demand

	// This line may throw a exception on runtime if the page wasn't found.
	var pageBundle = require("bundle!./" + name + "Page");

	// Wait until the chunk is loaded
	pageBundle(function(page) {
		render(page);
	});
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
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, callbacks = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, __webpack_require__);
/******/ 		if(moreModules[0]) {
/******/ 			installedModules[0] = 0;
/******/ 			__webpack_require__(0);
/******/ 		}
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		0:0
/******/ 	};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
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
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
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
/******/ 	__webpack_require__.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, __webpack_require__);
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
/******/ 			script.src = __webpack_require__.p + "" + chunkId + ".chunk.js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*******************!*\
  !*** ./router.js ***!
  \*******************/
/***/ function(module, exports, __webpack_require__) {

	var render = __webpack_require__(/*! ./render */ 3);

	// Event when another page should be opened
	// Maybe hook click on links, hashchange or popstate
	window.onLinkToPage = function onLinkToPage(name) { // name is "a" or "b"
		// require the page with a dynamic require

		// It's important that this require only matches the pages
		//  elsewise there is blood in the bundle. Here this is done with a
		//  specific file prefix. It's also possible to use a directory,
		//  overwriting the RegExp with the ContextReplacementPlugin, or
		//  using the require.context method.

		// The bundle-loader is used to create a chunk from the page
		//  -> Pages are only loaded on demand

		// This line may throw a exception on runtime if the page wasn't found.
		var pageBundle = __webpack_require__(/*! bundle!. */ 4)("./" + name + "Page");

		// Wait until the chunk is loaded
		pageBundle(function(page) {
			render(page);
		});
	}

/***/ },
/* 1 */,
/* 2 */,
/* 3 */
/*!*******************!*\
  !*** ./render.js ***!
  \*******************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = function(page) {
		console.log(page());
	};

/***/ },
/* 4 */
/*!************************************************!*\
  !*** . (webpack)/~/bundle-loader!^\.\/.*Page$ ***!
  \************************************************/
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./aPage": 5,
		"./bPage": 6
	};
	function webpackContext(req) {
		return __webpack_require__(webpackContextResolve(req));
	};
	function webpackContextResolve(req) {
		return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
	};
	webpackContext.keys = function webpackContextKeys() {
		return Object.keys(map);
	};
	webpackContext.resolve = webpackContextResolve;
	module.exports = webpackContext;


/***/ },
/* 5 */
/*!********************************************!*\
  !*** (webpack)/~/bundle-loader!./aPage.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	var cbs = [], 
		data;
	module.exports = function(cb) {
		if(cbs) cbs.push(cb);
		else cb(data);
	}
	__webpack_require__.e/*nsure*/(2, function(require) {
		data = __webpack_require__(/*! !./aPage.js */ 1);
		var callbacks = cbs;
		cbs = null;
		for(var i = 0, l = callbacks.length; i < l; i++) {
			callbacks[i](data);
		}
	});

/***/ },
/* 6 */
/*!********************************************!*\
  !*** (webpack)/~/bundle-loader!./bPage.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	var cbs = [], 
		data;
	module.exports = function(cb) {
		if(cbs) cbs.push(cb);
		else cb(data);
	}
	__webpack_require__.e/*nsure*/(1, function(require) {
		data = __webpack_require__(/*! !./bPage.js */ 2);
		var callbacks = cbs;
		cbs = null;
		for(var i = 0, l = callbacks.length; i < l; i++) {
			callbacks[i](data);
		}
	});

/***/ }
/******/ ])
```

# js/pageA.bundle.js

``` javascript
webpackJsonp([4,2],[
/* 0 */
/*!*******************!*\
  !*** ./aEntry.js ***!
  \*******************/
/***/ function(module, exports, __webpack_require__) {

	// Just show the page "a"
	var render = __webpack_require__(/*! ./render */ 3);
	render(__webpack_require__(/*! ./aPage */ 1));

/***/ },
/* 1 */
/*!******************!*\
  !*** ./aPage.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = function() {
		return "This is page A.";
	};

/***/ }
]);
```

# js/1.chunk.js

``` javascript
webpackJsonp([1],{

/***/ 2:
/*!******************!*\
  !*** ./bPage.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = function() {
		return "This is page B.";
	};

/***/ }

});
```

# Info

## Uncompressed

```
Hash: 4a64c0f0bd8d94f458a6
Version: webpack 1.3.0-beta8
Time: 339ms
          Asset  Size  Chunks             Chunk Names
     commons.js  6810       0  [emitted]  commons.js
     1.chunk.js   234       1  [emitted]  
     2.chunk.js   240       2  [emitted]  
pageB.bundle.js   521    3, 1  [emitted]  pageB
pageA.bundle.js   512    4, 2  [emitted]  pageA
chunk    {0} commons.js (commons.js) 1894 [rendered]
    > commons.js [0] ./router.js 
    [0] ./router.js 894 {0} [built]
    [3] ./render.js 60 {0} [built]
        cjs require ./render [0] ./aEntry.js 2:13-32
        cjs require ./render [0] ./bEntry.js 2:13-32
        cjs require ./render [0] ./router.js 1:13-32
    [4] . (webpack)/~/bundle-loader!^\.\/.*Page$ 184 {0} [built]
        cjs require context bundle!. [0] ./router.js 18:18-54
    [5] (webpack)/~/bundle-loader!./aPage.js 378 {0} [built]
        context element ./aPage [4] . (webpack)/~/bundle-loader!^\.\/.*Page$
    [6] (webpack)/~/bundle-loader!./bPage.js 378 {0} [built]
        context element ./bPage [4] . (webpack)/~/bundle-loader!^\.\/.*Page$
chunk    {1} 1.chunk.js 61 {0} [rendered]
    > [6] (webpack)/~/bundle-loader!./bPage.js 7:0-14:2
    [2] ./bPage.js 61 {1} {3} [built]
        cjs require ./bPage [0] ./bEntry.js 3:7-25
        cjs require !!.\bPage.js [6] (webpack)/~/bundle-loader!./bPage.js 8:8-127
chunk    {2} 2.chunk.js 61 {0} [rendered]
    > [5] (webpack)/~/bundle-loader!./aPage.js 7:0-14:2
    [1] ./aPage.js 61 {2} {4} [built]
        cjs require ./aPage [0] ./aEntry.js 3:7-25
        cjs require !!.\aPage.js [5] (webpack)/~/bundle-loader!./aPage.js 8:8-127
chunk    {3} pageB.bundle.js (pageB) 150 {0} [rendered]
    > pageB [0] ./bEntry.js 
    [0] ./bEntry.js 89 {3} [built]
    [2] ./bPage.js 61 {1} {3} [built]
        cjs require ./bPage [0] ./bEntry.js 3:7-25
        cjs require !!.\bPage.js [6] (webpack)/~/bundle-loader!./bPage.js 8:8-127
chunk    {4} pageA.bundle.js (pageA) 150 {0} [rendered]
    > pageA [0] ./aEntry.js 
    [0] ./aEntry.js 89 {4} [built]
    [1] ./aPage.js 61 {2} {4} [built]
        cjs require ./aPage [0] ./aEntry.js 3:7-25
        cjs require !!.\aPage.js [5] (webpack)/~/bundle-loader!./aPage.js 8:8-127
```

## Minimized (uglify-js, no zip)

```
Hash: d6818ba533e51b078ff9
Version: webpack 1.3.0-beta8
Time: 869ms
          Asset  Size  Chunks             Chunk Names
     commons.js  1396       0  [emitted]  commons.js
     1.chunk.js    81       1  [emitted]  
     2.chunk.js    80       2  [emitted]  
pageB.bundle.js   118    3, 1  [emitted]  pageB
pageA.bundle.js   117    4, 2  [emitted]  pageA
chunk    {0} commons.js (commons.js) 1894 [rendered]
    > commons.js [0] ./router.js 
    [0] ./router.js 894 {0} [built]
    [3] ./render.js 60 {0} [built]
        cjs require ./render [0] ./aEntry.js 2:13-32
        cjs require ./render [0] ./bEntry.js 2:13-32
        cjs require ./render [0] ./router.js 1:13-32
    [4] . (webpack)/~/bundle-loader!^\.\/.*Page$ 184 {0} [built]
        cjs require context bundle!. [0] ./router.js 18:18-54
    [5] (webpack)/~/bundle-loader!./aPage.js 378 {0} [built]
        context element ./aPage [4] . (webpack)/~/bundle-loader!^\.\/.*Page$
    [6] (webpack)/~/bundle-loader!./bPage.js 378 {0} [built]
        context element ./bPage [4] . (webpack)/~/bundle-loader!^\.\/.*Page$
chunk    {1} 1.chunk.js 61 {0} [rendered]
    > [6] (webpack)/~/bundle-loader!./bPage.js 7:0-14:2
    [2] ./bPage.js 61 {1} {3} [built]
        cjs require ./bPage [0] ./bEntry.js 3:7-25
        cjs require !!.\bPage.js [6] (webpack)/~/bundle-loader!./bPage.js 8:8-127
chunk    {2} 2.chunk.js 61 {0} [rendered]
    > [5] (webpack)/~/bundle-loader!./aPage.js 7:0-14:2
    [1] ./aPage.js 61 {2} {4} [built]
        cjs require ./aPage [0] ./aEntry.js 3:7-25
        cjs require !!.\aPage.js [5] (webpack)/~/bundle-loader!./aPage.js 8:8-127
chunk    {3} pageB.bundle.js (pageB) 150 {0} [rendered]
    > pageB [0] ./bEntry.js 
    [0] ./bEntry.js 89 {3} [built]
    [2] ./bPage.js 61 {1} {3} [built]
        cjs require ./bPage [0] ./bEntry.js 3:7-25
        cjs require !!.\bPage.js [6] (webpack)/~/bundle-loader!./bPage.js 8:8-127
chunk    {4} pageA.bundle.js (pageA) 150 {0} [rendered]
    > pageA [0] ./aEntry.js 
    [0] ./aEntry.js 89 {4} [built]
    [1] ./aPage.js 61 {2} {4} [built]
        cjs require ./aPage [0] ./aEntry.js 3:7-25
        cjs require !!.\aPage.js [5] (webpack)/~/bundle-loader!./aPage.js 8:8-127

WARNING in commons.js from UglifyJs
Dropping unused function argument require [(webpack)/~/bundle-loader!./aPage.js:7,0]
Dropping unused function argument require [(webpack)/~/bundle-loader!./bPage.js:7,0]
```
