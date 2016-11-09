# example.js

``` javascript
function getTemplate(templateName, callback) {
	require(["../require.context/templates/"+templateName], function(tmpl) {
		callback(tmpl());
	});
}
getTemplate("a", function(a) {
	console.log(a);
});
getTemplate("b", function(b) {
	console.log(b);
});
```

# js/output.js

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

/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		0:0
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
/******/ 	__webpack_require__.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, __webpack_require__);

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
/******/ 			script.async = true;

/******/ 			script.src = __webpack_require__.p + "" + chunkId + ".output.js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	function getTemplate(templateName, callback) {
		__webpack_require__.e/* require */(1, function(__webpack_require__) { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ../require.context/templates */ 1)("./"+templateName)]; (function(tmpl) {
			callback(tmpl());
		}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));});
	}
	getTemplate("a", function(a) {
		console.log(a);
	});
	getTemplate("b", function(b) {
		console.log(b);
	});

/***/ }
/******/ ]);
```

# js/1.output.js

``` javascript
webpackJsonp([1],[
/* 0 */,
/* 1 */
/*!*********************************************!*\
  !*** ../require.context/templates ^\.\/.*$ ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./a": 2,
		"./a.js": 2,
		"./b": 3,
		"./b.js": 3,
		"./c": 4,
		"./c.js": 4
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
	webpackContext.id = 1;


/***/ },
/* 2 */
/*!*****************************************!*\
  !*** ../require.context/templates/a.js ***!
  \*****************************************/
/***/ function(module, exports) {

	module.exports = function() {
		return "This text was generated by template A";
	}

/***/ },
/* 3 */
/*!*****************************************!*\
  !*** ../require.context/templates/b.js ***!
  \*****************************************/
/***/ function(module, exports) {

	module.exports = function() {
		return "This text was generated by template B";
	}

/***/ },
/* 4 */
/*!*****************************************!*\
  !*** ../require.context/templates/c.js ***!
  \*****************************************/
/***/ function(module, exports) {

	module.exports = function() {
		return "This text was generated by template C";
	}

/***/ }
]);
```

# Info

## Uncompressed

```
Hash: 07e105e1c0b1862a78c9
Version: webpack 1.9.10
Time: 84ms
      Asset     Size  Chunks             Chunk Names
  output.js  4.09 kB       0  [emitted]  main
1.output.js  1.61 kB       1  [emitted]  
chunk    {0} output.js (main) 261 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 261 bytes {0} [built]
chunk    {1} 1.output.js 463 bytes {0} [rendered]
    > [0] ./example.js 2:1-4:3
    [1] ../require.context/templates ^\.\/.*$ 217 bytes {1} [built]
        amd require context ../require.context/templates [0] ./example.js 2:1-4:3
    [2] ../require.context/templates/a.js 82 bytes {1} [optional] [built]
        context element ./a.js [1] ../require.context/templates ^\.\/.*$
        context element ./a [1] ../require.context/templates ^\.\/.*$
    [3] ../require.context/templates/b.js 82 bytes {1} [optional] [built]
        context element ./b.js [1] ../require.context/templates ^\.\/.*$
        context element ./b [1] ../require.context/templates ^\.\/.*$
    [4] ../require.context/templates/c.js 82 bytes {1} [optional] [built]
        context element ./c.js [1] ../require.context/templates ^\.\/.*$
        context element ./c [1] ../require.context/templates ^\.\/.*$
```

## Minimized (uglify-js, no zip)

```
Hash: 2d1494c43288d06719f8
Version: webpack 1.9.10
Time: 270ms
      Asset       Size  Chunks             Chunk Names
0.output.js  541 bytes       0  [emitted]  
  output.js  878 bytes       1  [emitted]  main
chunk    {0} 0.output.js 463 bytes {1} [rendered]
    > [0] ./example.js 2:1-4:3
    [1] ../require.context/templates/a.js 82 bytes {0} [optional] [built]
        context element ./a.js [4] ../require.context/templates ^\.\/.*$
        context element ./a [4] ../require.context/templates ^\.\/.*$
    [2] ../require.context/templates/b.js 82 bytes {0} [optional] [built]
        context element ./b.js [4] ../require.context/templates ^\.\/.*$
        context element ./b [4] ../require.context/templates ^\.\/.*$
    [3] ../require.context/templates/c.js 82 bytes {0} [optional] [built]
        context element ./c.js [4] ../require.context/templates ^\.\/.*$
        context element ./c [4] ../require.context/templates ^\.\/.*$
    [4] ../require.context/templates ^\.\/.*$ 217 bytes {0} [built]
        amd require context ../require.context/templates [0] ./example.js 2:1-4:3
chunk    {1} output.js (main) 261 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 261 bytes {1} [built]
```
