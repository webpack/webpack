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
		new CommonsChunkPlugin({
			name: "commons",
			filename: "commons.js"
		})
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
/******/ 		0: 0
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

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { throw err; };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*******************!*\
  !*** ./render.js ***!
  \*******************/
/***/ function(module, exports) {

	module.exports = function(page) {
		console.log(page());
	};

/***/ }
/******/ ]);
```

# js/pageA.bundle.js

``` javascript
webpackJsonp([5,2],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./aPage.js ***!
  \******************/
/***/ function(module, exports) {

	module.exports = function() {
		return "This is page A.";
	};

/***/ },
/* 2 */,
/* 3 */,
/* 4 */
/*!*******************!*\
  !*** ./aEntry.js ***!
  \*******************/
/***/ function(module, exports, __webpack_require__) {

	// Just show the page "a"
	var render = __webpack_require__(/*! ./render */ 0);
	render(__webpack_require__(/*! ./aPage */ 1));

/***/ }
],[4]);
```

# js/1.chunk.js

``` javascript
webpackJsonp([1],{

/***/ 2:
/*!******************!*\
  !*** ./bPage.js ***!
  \******************/
/***/ function(module, exports) {

	module.exports = function() {
		return "This is page B.";
	};

/***/ }

});
```

# Info

## Uncompressed

```
Hash: 99369bd55499f540a867
Version: webpack 2.0.6-beta
Time: 187ms
               Asset       Size  Chunks             Chunk Names
          commons.js    4.29 kB       0  [emitted]  commons
          1.chunk.js  213 bytes       1  [emitted]  
          2.chunk.js  219 bytes       2  [emitted]  
commons.js.bundle.js    3.21 kB       3  [emitted]  commons.js
     pageB.bundle.js  500 bytes    4, 1  [emitted]  pageB
     pageA.bundle.js  522 bytes    5, 2  [emitted]  pageA
chunk    {0} commons.js (commons) 60 bytes [rendered]
    [0] ./render.js 60 bytes {0} [built]
        cjs require ./render [4] ./aEntry.js 2:13-32
        cjs require ./render [5] ./bEntry.js 2:13-32
        cjs require ./render [6] ./router.js 1:13-32
chunk    {1} 1.chunk.js 61 bytes {3} [rendered]
    > [8] (webpack)/~/bundle-loader!./bPage.js 7:0-14:2
    [2] ./bPage.js 61 bytes {1} {4} [built]
        cjs require ./bPage [5] ./bEntry.js 3:7-25
        cjs require !!./bPage.js [8] (webpack)/~/bundle-loader!./bPage.js 8:8-31
chunk    {2} 2.chunk.js 61 bytes {3} [rendered]
    > [7] (webpack)/~/bundle-loader!./aPage.js 7:0-14:2
    [1] ./aPage.js 61 bytes {2} {5} [built]
        cjs require ./aPage [4] ./aEntry.js 3:7-25
        cjs require !!./aPage.js [7] (webpack)/~/bundle-loader!./aPage.js 8:8-31
chunk    {3} commons.js.bundle.js (commons.js) 1.64 kB {0} [rendered]
    > commons.js [6] ./router.js 
    [3] . (webpack)/~/bundle-loader!^\.\/.*Page$ 184 bytes {3} [built]
        cjs require context bundle!. [6] ./router.js 18:18-54
    [6] ./router.js 894 bytes {3} [built]
    [7] (webpack)/~/bundle-loader!./aPage.js 282 bytes {3} [optional] [built]
        context element ./aPage [3] . (webpack)/~/bundle-loader!^\.\/.*Page$
    [8] (webpack)/~/bundle-loader!./bPage.js 282 bytes {3} [optional] [built]
        context element ./bPage [3] . (webpack)/~/bundle-loader!^\.\/.*Page$
chunk    {4} pageB.bundle.js (pageB) 150 bytes {0} [rendered]
    > pageB [5] ./bEntry.js 
    [2] ./bPage.js 61 bytes {1} {4} [built]
        cjs require ./bPage [5] ./bEntry.js 3:7-25
        cjs require !!./bPage.js [8] (webpack)/~/bundle-loader!./bPage.js 8:8-31
    [5] ./bEntry.js 89 bytes {4} [built]
chunk    {5} pageA.bundle.js (pageA) 150 bytes {0} [rendered]
    > pageA [4] ./aEntry.js 
    [1] ./aPage.js 61 bytes {2} {5} [built]
        cjs require ./aPage [4] ./aEntry.js 3:7-25
        cjs require !!./aPage.js [7] (webpack)/~/bundle-loader!./aPage.js 8:8-31
    [4] ./aEntry.js 89 bytes {5} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 99369bd55499f540a867
Version: webpack 2.0.6-beta
Time: 388ms
               Asset       Size  Chunks             Chunk Names
          commons.js    1.01 kB       0  [emitted]  commons
          1.chunk.js   83 bytes       1  [emitted]  
          2.chunk.js   82 bytes       2  [emitted]  
commons.js.bundle.js  776 bytes       3  [emitted]  commons.js
     pageB.bundle.js  127 bytes    4, 1  [emitted]  pageB
     pageA.bundle.js  126 bytes    5, 2  [emitted]  pageA
chunk    {0} commons.js (commons) 60 bytes [rendered]
    [0] ./render.js 60 bytes {0} [built]
        cjs require ./render [4] ./aEntry.js 2:13-32
        cjs require ./render [5] ./bEntry.js 2:13-32
        cjs require ./render [6] ./router.js 1:13-32
chunk    {1} 1.chunk.js 61 bytes {3} [rendered]
    > [8] (webpack)/~/bundle-loader!./bPage.js 7:0-14:2
    [2] ./bPage.js 61 bytes {1} {4} [built]
        cjs require ./bPage [5] ./bEntry.js 3:7-25
        cjs require !!./bPage.js [8] (webpack)/~/bundle-loader!./bPage.js 8:8-31
chunk    {2} 2.chunk.js 61 bytes {3} [rendered]
    > [7] (webpack)/~/bundle-loader!./aPage.js 7:0-14:2
    [1] ./aPage.js 61 bytes {2} {5} [built]
        cjs require ./aPage [4] ./aEntry.js 3:7-25
        cjs require !!./aPage.js [7] (webpack)/~/bundle-loader!./aPage.js 8:8-31
chunk    {3} commons.js.bundle.js (commons.js) 1.64 kB {0} [rendered]
    > commons.js [6] ./router.js 
    [3] . (webpack)/~/bundle-loader!^\.\/.*Page$ 184 bytes {3} [built]
        cjs require context bundle!. [6] ./router.js 18:18-54
    [6] ./router.js 894 bytes {3} [built]
    [7] (webpack)/~/bundle-loader!./aPage.js 282 bytes {3} [optional] [built]
        context element ./aPage [3] . (webpack)/~/bundle-loader!^\.\/.*Page$
    [8] (webpack)/~/bundle-loader!./bPage.js 282 bytes {3} [optional] [built]
        context element ./bPage [3] . (webpack)/~/bundle-loader!^\.\/.*Page$
chunk    {4} pageB.bundle.js (pageB) 150 bytes {0} [rendered]
    > pageB [5] ./bEntry.js 
    [2] ./bPage.js 61 bytes {1} {4} [built]
        cjs require ./bPage [5] ./bEntry.js 3:7-25
        cjs require !!./bPage.js [8] (webpack)/~/bundle-loader!./bPage.js 8:8-31
    [5] ./bEntry.js 89 bytes {4} [built]
chunk    {5} pageA.bundle.js (pageA) 150 bytes {0} [rendered]
    > pageA [4] ./aEntry.js 
    [1] ./aPage.js 61 bytes {2} {5} [built]
        cjs require ./aPage [4] ./aEntry.js 3:7-25
        cjs require !!./aPage.js [7] (webpack)/~/bundle-loader!./aPage.js 8:8-31
    [4] ./aEntry.js 89 bytes {5} [built]
```
