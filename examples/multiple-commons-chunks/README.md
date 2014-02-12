# pageA.js

``` javascript
require("./modules/a-b-c");
require("./modules/a-b");
require("./modules/a-c");

```

# adminPageA.js

``` javascript
require("./modules/a-b-c");
require("./modules/admin");
```

# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC",
		adminPageA: "./adminPageA",
		adminPageB: "./adminPageB",
		adminPageC: "./adminPageC",
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js"
	},
	plugins: [
		new CommonsChunkPlugin("admin-commons.js", ["adminPageA", "adminPageB"]),
		new CommonsChunkPlugin("commons.js", ["pageA", "pageB", "admin-commons.js"], 2),
		new CommonsChunkPlugin("c-commons.js", ["pageC", "adminPageC"]),
	]
}
```

# pageA.html

``` html
<html>
	<head></head>
	<body>
		<script src="js/commons.js" charset="utf-8"></script>
		<script src="js/pageA.js" charset="utf-8"></script>
	</body>
</html>
```

# adminPageA.html

``` html
<html>
	<head></head>
	<body>
		<script src="js/commons.js" charset="utf-8"></script>
		<script src="js/admin-commons.js" charset="utf-8"></script>
		<script src="js/adminPageA.js" charset="utf-8"></script>
	</body>
</html>
```

# js/commons.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// shortcut for better minimizing
/******/ 	var exports = "exports";
/******/ 	
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		0:0,
/******/ 		1:0
/******/ 	};
/******/ 	
/******/ 	// The require function
/******/ 	function require(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId][exports];
/******/ 		
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/ 		
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module[exports], module, module[exports], require);
/******/ 		
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 		
/******/ 		// Return the exports of the module
/******/ 		return module[exports];
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
/******/ 			script.src = require.p + "" + chunkId + "..js";
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
/******/ 	// __webpack_public_path__
/******/ 	require.p = "js/";
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
/******/ 		if(moreModules[0]) {
/******/ 			installedModules[0] = 0;
/******/ 			require(0);
/******/ 		}
/******/ 	};
/******/ })
/************************************************************************/
/******/ ({

/***/ 1:
/*!**************************!*\
  !*** ./modules/a-b-c.js ***!
  \**************************/
/***/ function(module, exports, require) {



/***/ },

/***/ 5:
/*!************************!*\
  !*** ./modules/a-b.js ***!
  \************************/
/***/ function(module, exports, require) {



/***/ }

/******/ })
```

# js/pageA.js

``` javascript
webpackJsonp([4],[
/* 0 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports, require) {

	require(/*! ./modules/a-b-c */ 1);
	require(/*! ./modules/a-b */ 5);
	require(/*! ./modules/a-c */ 3);


/***/ },
/* 1 */,
/* 2 */,
/* 3 */
/*!************************!*\
  !*** ./modules/a-c.js ***!
  \************************/
/***/ function(module, exports, require) {



/***/ }
])
```

# js/admin-commons.js

``` javascript
webpackJsonp([6],{

/***/ 2:
/*!**************************!*\
  !*** ./modules/admin.js ***!
  \**************************/
/***/ function(module, exports, require) {



/***/ }

})
```

# js/adminPageA.js

``` javascript
webpackJsonp([8],[
/* 0 */
/*!***********************!*\
  !*** ./adminPageA.js ***!
  \***********************/
/***/ function(module, exports, require) {

	require(/*! ./modules/a-b-c */ 1);
	require(/*! ./modules/admin */ 2);

/***/ }
])
```

# Info

## Uncompressed

```
Hash: e0239cf99f16d63fc38c
Version: webpack 1.0.0-rc5
Time: 83ms
           Asset  Size  Chunks             Chunk Names     
      commons.js  3766    0, 1  [emitted]  commons.js      
    c-commons.js  3602       1  [emitted]  c-commons.js    
        pageC.js   583       2  [emitted]  pageC           
        pageB.js   440       3  [emitted]  pageB           
        pageA.js   431       4  [emitted]  pageA           
   adminPageC.js   410    5, 6  [emitted]  adminPageC      
admin-commons.js   181       6  [emitted]  admin-commons.js
   adminPageB.js   241       7  [emitted]  adminPageB      
   adminPageA.js   241       8  [emitted]  adminPageA      
chunk    {0} commons.js (commons.js) 0 [rendered]
    [1] ./modules/a-b-c.js 0 {0} {1} [built]
        cjs require ./modules/a-b-c [0] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageC.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageB.js 1:0-26
    [5] ./modules/a-b.js 0 {0} [built]
        cjs require ./modules/a-b [0] ./pageA.js 2:0-24
        cjs require ./modules/a-b [0] ./pageB.js 2:0-24
chunk    {1} c-commons.js (c-commons.js) 0 [rendered]
    [1] ./modules/a-b-c.js 0 {0} {1} [built]
        cjs require ./modules/a-b-c [0] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageC.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageB.js 1:0-26
chunk    {2} pageC.js (pageC) 83 {1} [rendered]
    > pageC [0] ./pageC.js
    [0] ./pageC.js 83 {2} [built]
    [3] ./modules/a-c.js 0 {2} {4} [built]
        cjs require ./modules/a-c [0] ./pageA.js 3:0-24
        cjs require ./modules/a-c [0] ./pageC.js 3:0-24
    [4] ./modules/b-c.js 0 {2} {3} [built]
        cjs require ./modules/b-c [0] ./pageC.js 2:0-24
        cjs require ./modules/b-c [0] ./pageB.js 3:0-24
chunk    {3} pageB.js (pageB) 83 {0} [rendered]
    > pageB [0] ./pageB.js
    [0] ./pageB.js 83 {3} [built]
    [4] ./modules/b-c.js 0 {2} {3} [built]
        cjs require ./modules/b-c [0] ./pageC.js 2:0-24
        cjs require ./modules/b-c [0] ./pageB.js 3:0-24
chunk    {4} pageA.js (pageA) 83 {0} [rendered]
    > pageA [0] ./pageA.js
    [0] ./pageA.js 83 {4} [built]
    [3] ./modules/a-c.js 0 {2} {4} [built]
        cjs require ./modules/a-c [0] ./pageA.js 3:0-24
        cjs require ./modules/a-c [0] ./pageC.js 3:0-24
chunk    {5} adminPageC.js (adminPageC) 56 {1} [rendered]
    > adminPageC [0] ./adminPageC.js
    [0] ./adminPageC.js 56 {5} [built]
    [2] ./modules/admin.js 0 {5} {6} [built]
        cjs require ./modules/admin [0] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageC.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageB.js 2:0-26
chunk    {6} admin-commons.js (admin-commons.js) 0 {0} [rendered]
    [2] ./modules/admin.js 0 {5} {6} [built]
        cjs require ./modules/admin [0] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageC.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageB.js 2:0-26
chunk    {7} adminPageB.js (adminPageB) 56 {6} [rendered]
    > adminPageB [0] ./adminPageB.js
    [0] ./adminPageB.js 56 {7} [built]
chunk    {8} adminPageA.js (adminPageA) 56 {6} [rendered]
    > adminPageA [0] ./adminPageA.js
    [0] ./adminPageA.js 56 {8} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: aa2c74521459af8eb0fd
Version: webpack 1.0.0-rc5
Time: 277ms
           Asset  Size  Chunks             Chunk Names     
      commons.js   686    0, 1  [emitted]  commons.js      
    c-commons.js   666       1  [emitted]  c-commons.js    
        pageC.js    80       2  [emitted]  pageC           
        pageB.js    68       3  [emitted]  pageB           
        pageA.js    67       4  [emitted]  pageA           
   adminPageC.js    63    5, 6  [emitted]  adminPageC      
admin-commons.js    35       6  [emitted]  admin-commons.js
   adminPageB.js    47       7  [emitted]  adminPageB      
   adminPageA.js    47       8  [emitted]  adminPageA      
chunk    {0} commons.js (commons.js) 0 [rendered]
    [1] ./modules/a-b-c.js 0 {0} {1} [built]
        cjs require ./modules/a-b-c [0] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageC.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageA.js 1:0-26
    [5] ./modules/a-b.js 0 {0} [built]
        cjs require ./modules/a-b [0] ./pageA.js 2:0-24
        cjs require ./modules/a-b [0] ./pageB.js 2:0-24
chunk    {1} c-commons.js (c-commons.js) 0 [rendered]
    [1] ./modules/a-b-c.js 0 {0} {1} [built]
        cjs require ./modules/a-b-c [0] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageC.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageA.js 1:0-26
chunk    {2} pageC.js (pageC) 83 {1} [rendered]
    > pageC [0] ./pageC.js
    [0] ./pageC.js 83 {2} [built]
    [3] ./modules/a-c.js 0 {2} {4} [built]
        cjs require ./modules/a-c [0] ./pageA.js 3:0-24
        cjs require ./modules/a-c [0] ./pageC.js 3:0-24
    [4] ./modules/b-c.js 0 {2} {3} [built]
        cjs require ./modules/b-c [0] ./pageC.js 2:0-24
        cjs require ./modules/b-c [0] ./pageB.js 3:0-24
chunk    {3} pageB.js (pageB) 83 {0} [rendered]
    > pageB [0] ./pageB.js
    [0] ./pageB.js 83 {3} [built]
    [4] ./modules/b-c.js 0 {2} {3} [built]
        cjs require ./modules/b-c [0] ./pageC.js 2:0-24
        cjs require ./modules/b-c [0] ./pageB.js 3:0-24
chunk    {4} pageA.js (pageA) 83 {0} [rendered]
    > pageA [0] ./pageA.js
    [0] ./pageA.js 83 {4} [built]
    [3] ./modules/a-c.js 0 {2} {4} [built]
        cjs require ./modules/a-c [0] ./pageA.js 3:0-24
        cjs require ./modules/a-c [0] ./pageC.js 3:0-24
chunk    {5} adminPageC.js (adminPageC) 56 {1} [rendered]
    > adminPageC [0] ./adminPageC.js
    [0] ./adminPageC.js 56 {5} [built]
    [2] ./modules/admin.js 0 {5} {6} [built]
        cjs require ./modules/admin [0] ./adminPageC.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageA.js 2:0-26
chunk    {6} admin-commons.js (admin-commons.js) 0 {0} [rendered]
    [2] ./modules/admin.js 0 {5} {6} [built]
        cjs require ./modules/admin [0] ./adminPageC.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageA.js 2:0-26
chunk    {7} adminPageB.js (adminPageB) 56 {6} [rendered]
    > adminPageB [0] ./adminPageB.js
    [0] ./adminPageB.js 56 {7} [built]
chunk    {8} adminPageA.js (adminPageA) 56 {6} [rendered]
    > adminPageA [0] ./adminPageA.js
    [0] ./adminPageA.js 56 {8} [built]
```
