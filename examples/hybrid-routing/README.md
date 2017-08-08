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
		"commons": "./router"
	},
	output: {
		path: path.join(__dirname, "js"),
		publicPath: "js/",
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
};
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
	var pageBundle = require("bundle-loader!./" + name + "Page");

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

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

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
/******/ 			if(installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules, executeModules);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/ 		if(executeModules) {
/******/ 			for(i=0; i < executeModules.length; i++) {
/******/ 				result = __webpack_require__(__webpack_require__.s = executeModules[i]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		4: 0
/******/ 	};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData === 0) {
/******/ 			return new Promise(function(resolve) { resolve(); });
/******/ 		}
/******/
/******/ 		// a Promise means "currently loading".
/******/ 		if(installedChunkData) {
/******/ 			return installedChunkData[2];
/******/ 		}
/******/
/******/ 		// setup Promise in chunk cache
/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		installedChunkData[2] = promise;
/******/
/******/ 		// start chunk loading
/******/ 		var head = document.getElementsByTagName('head')[0];
/******/ 		var script = document.createElement('script');
/******/ 		script.type = 'text/javascript';
/******/ 		script.charset = 'utf-8';
/******/ 		script.async = true;
/******/ 		script.timeout = 120000;
/******/
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
/******/ 				if(chunk) {
/******/ 					chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));
/******/ 				}
/******/ 				installedChunks[chunkId] = undefined;
/******/ 			}
/******/ 		};
/******/ 		head.appendChild(script);
/******/
/******/ 		return promise;
/******/ 	};
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
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
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!*******************!*\
  !*** ./render.js ***!
  \*******************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = function(page) {
	console.log(page());
};

/***/ }),
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */,
/* 5 */
/*!*******************!*\
  !*** ./router.js ***!
  \*******************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

var render = __webpack_require__(/*! ./render */ 0);

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
	var pageBundle = __webpack_require__(/*! bundle-loader!. */ 6)("./" + name + "Page");

	// Wait until the chunk is loaded
	pageBundle(function(page) {
		render(page);
	});
}


/***/ }),
/* 6 */
/*!***********************************************************!*\
  !*** . (webpack)/node_modules/bundle-loader ^\.\/.*Page$ ***!
  \***********************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

var map = {
	"./aPage": 7,
	"./bPage": 8
};
function webpackContext(req) {
	return __webpack_require__(webpackContextResolve(req));
};
function webpackContextResolve(req) {
	var id = map[req];
	if(!(id + 1)) // check for number or string
		throw new Error("Cannot find module '" + req + "'.");
	return id;
};
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = 6;

/***/ }),
/* 7 */
/*!*******************************************************!*\
  !*** (webpack)/node_modules/bundle-loader!./aPage.js ***!
  \*******************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

var cbs = [], 
	data;
module.exports = function(cb) {
	if(cbs) cbs.push(cb);
	else cb(data);
}
__webpack_require__.e/* require.ensure */(1).then((function(require) {
	data = __webpack_require__(/*! !./aPage.js */ 1);
	var callbacks = cbs;
	cbs = null;
	for(var i = 0, l = callbacks.length; i < l; i++) {
		callbacks[i](data);
	}
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

/***/ }),
/* 8 */
/*!*******************************************************!*\
  !*** (webpack)/node_modules/bundle-loader!./bPage.js ***!
  \*******************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

var cbs = [], 
	data;
module.exports = function(cb) {
	if(cbs) cbs.push(cb);
	else cb(data);
}
__webpack_require__.e/* require.ensure */(0).then((function(require) {
	data = __webpack_require__(/*! !./bPage.js */ 2);
	var callbacks = cbs;
	cbs = null;
	for(var i = 0, l = callbacks.length; i < l; i++) {
		callbacks[i](data);
	}
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

/***/ })
/******/ ]);
```

# js/pageA.bundle.js

``` javascript
webpackJsonp([3,1],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./aPage.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = function() {
	return "This is page A.";
};

/***/ }),
/* 2 */,
/* 3 */
/*!*******************!*\
  !*** ./aEntry.js ***!
  \*******************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

// Just show the page "a"
var render = __webpack_require__(/*! ./render */ 0);
render(__webpack_require__(/*! ./aPage */ 1));

/***/ })
],[3]);
```

# js/1.chunk.js

``` javascript
webpackJsonp([1],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./aPage.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = function() {
	return "This is page A.";
};

/***/ })
]);
```

# Info

## Uncompressed

```
Hash: 4b00bdf84d7923f55b44
Version: webpack 3.5.1
          Asset       Size  Chunks             Chunk Names
     0.chunk.js  267 bytes       0  [emitted]  
     1.chunk.js  273 bytes       1  [emitted]  
pageB.bundle.js  630 bytes    2, 0  [emitted]  pageB
pageA.bundle.js  621 bytes    3, 1  [emitted]  pageA
     commons.js    9.59 kB       4  [emitted]  commons
Entrypoint pageA = commons.js pageA.bundle.js
Entrypoint pageB = commons.js pageB.bundle.js
Entrypoint commons = commons.js
chunk    {0} 0.chunk.js 61 bytes {4} [rendered]
    > [8] (webpack)/node_modules/bundle-loader!./bPage.js 7:0-14:2
    [2] ./bPage.js 61 bytes {0} {2} [built]
        cjs require ./bPage [4] ./bEntry.js 3:7-25
        cjs require !!./bPage.js [8] (webpack)/node_modules/bundle-loader!./bPage.js 8:8-31
chunk    {1} 1.chunk.js 61 bytes {4} [rendered]
    > [7] (webpack)/node_modules/bundle-loader!./aPage.js 7:0-14:2
    [1] ./aPage.js 61 bytes {1} {3} [built]
        cjs require ./aPage [3] ./aEntry.js 3:7-25
        cjs require !!./aPage.js [7] (webpack)/node_modules/bundle-loader!./aPage.js 8:8-31
chunk    {2} pageB.bundle.js (pageB) 150 bytes {4} [initial] [rendered]
    > pageB [4] ./bEntry.js 
    [2] ./bPage.js 61 bytes {0} {2} [built]
        cjs require ./bPage [4] ./bEntry.js 3:7-25
        cjs require !!./bPage.js [8] (webpack)/node_modules/bundle-loader!./bPage.js 8:8-31
    [4] ./bEntry.js 89 bytes {2} [built]
chunk    {3} pageA.bundle.js (pageA) 150 bytes {4} [initial] [rendered]
    > pageA [3] ./aEntry.js 
    [1] ./aPage.js 61 bytes {1} {3} [built]
        cjs require ./aPage [3] ./aEntry.js 3:7-25
        cjs require !!./aPage.js [7] (webpack)/node_modules/bundle-loader!./aPage.js 8:8-31
    [3] ./aEntry.js 89 bytes {3} [built]
chunk    {4} commons.js (commons) 1.71 kB [entry] [rendered]
    > commons [5] ./router.js 
    [0] ./render.js 60 bytes {4} [built]
        cjs require ./render [3] ./aEntry.js 2:13-32
        cjs require ./render [4] ./bEntry.js 2:13-32
        cjs require ./render [5] ./router.js 1:13-32
    [5] ./router.js 903 bytes {4} [built]
    [6] . (webpack)/node_modules/bundle-loader ^\.\/.*Page$ 184 bytes {4} [built]
        cjs require context bundle-loader!. [5] ./router.js 18:18-61
    [7] (webpack)/node_modules/bundle-loader!./aPage.js 282 bytes {4} [optional] [built]
        context element ./aPage [6] . (webpack)/node_modules/bundle-loader ^\.\/.*Page$ ./aPage
    [8] (webpack)/node_modules/bundle-loader!./bPage.js 282 bytes {4} [optional] [built]
        context element ./bPage [6] . (webpack)/node_modules/bundle-loader ^\.\/.*Page$ ./bPage
```

## Minimized (uglify-js, no zip)

```
Hash: 4b00bdf84d7923f55b44
Version: webpack 3.5.1
          Asset       Size  Chunks             Chunk Names
     0.chunk.js   83 bytes       0  [emitted]  
     1.chunk.js   82 bytes       1  [emitted]  
pageB.bundle.js  118 bytes    2, 0  [emitted]  pageB
pageA.bundle.js  117 bytes    3, 1  [emitted]  pageA
     commons.js    2.13 kB       4  [emitted]  commons
Entrypoint pageA = commons.js pageA.bundle.js
Entrypoint pageB = commons.js pageB.bundle.js
Entrypoint commons = commons.js
chunk    {0} 0.chunk.js 61 bytes {4} [rendered]
    > [8] (webpack)/node_modules/bundle-loader!./bPage.js 7:0-14:2
    [2] ./bPage.js 61 bytes {0} {2} [built]
        cjs require ./bPage [4] ./bEntry.js 3:7-25
        cjs require !!./bPage.js [8] (webpack)/node_modules/bundle-loader!./bPage.js 8:8-31
chunk    {1} 1.chunk.js 61 bytes {4} [rendered]
    > [7] (webpack)/node_modules/bundle-loader!./aPage.js 7:0-14:2
    [1] ./aPage.js 61 bytes {1} {3} [built]
        cjs require ./aPage [3] ./aEntry.js 3:7-25
        cjs require !!./aPage.js [7] (webpack)/node_modules/bundle-loader!./aPage.js 8:8-31
chunk    {2} pageB.bundle.js (pageB) 150 bytes {4} [initial] [rendered]
    > pageB [4] ./bEntry.js 
    [2] ./bPage.js 61 bytes {0} {2} [built]
        cjs require ./bPage [4] ./bEntry.js 3:7-25
        cjs require !!./bPage.js [8] (webpack)/node_modules/bundle-loader!./bPage.js 8:8-31
    [4] ./bEntry.js 89 bytes {2} [built]
chunk    {3} pageA.bundle.js (pageA) 150 bytes {4} [initial] [rendered]
    > pageA [3] ./aEntry.js 
    [1] ./aPage.js 61 bytes {1} {3} [built]
        cjs require ./aPage [3] ./aEntry.js 3:7-25
        cjs require !!./aPage.js [7] (webpack)/node_modules/bundle-loader!./aPage.js 8:8-31
    [3] ./aEntry.js 89 bytes {3} [built]
chunk    {4} commons.js (commons) 1.71 kB [entry] [rendered]
    > commons [5] ./router.js 
    [0] ./render.js 60 bytes {4} [built]
        cjs require ./render [3] ./aEntry.js 2:13-32
        cjs require ./render [4] ./bEntry.js 2:13-32
        cjs require ./render [5] ./router.js 1:13-32
    [5] ./router.js 903 bytes {4} [built]
    [6] . (webpack)/node_modules/bundle-loader ^\.\/.*Page$ 184 bytes {4} [built]
        cjs require context bundle-loader!. [5] ./router.js 18:18-61
    [7] (webpack)/node_modules/bundle-loader!./aPage.js 282 bytes {4} [optional] [built]
        context element ./aPage [6] . (webpack)/node_modules/bundle-loader ^\.\/.*Page$ ./aPage
    [8] (webpack)/node_modules/bundle-loader!./bPage.js 282 bytes {4} [optional] [built]
        context element ./bPage [6] . (webpack)/node_modules/bundle-loader ^\.\/.*Page$ ./bPage
```
