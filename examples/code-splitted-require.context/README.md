# example.js

``` javascript
function getTemplate(templateName, callback) {
	require.ensure([], function(require) {
		callback(require("../require.context/templates/"+templateName)());
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
/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".output.js";
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

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
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
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

function getTemplate(templateName, callback) {
	__webpack_require__.e/* require.ensure */(0).then((function(require) {
		callback(__webpack_require__(/*! ../require.context/templates */ 0)("./"+templateName)());
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
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

# js/0.output.js

``` javascript
webpackJsonp([0],[
/* 0 */
/* unknown exports provided */
/* all exports used */
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
	var id = map[req];
	if(!(id + 1)) // check for number
		throw new Error("Cannot find module '" + req + "'.");
	return id;
};
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = 0;


/***/ },
/* 1 */,
/* 2 */
/* unknown exports provided */
/* all exports used */
/*!*****************************************!*\
  !*** ../require.context/templates/a.js ***!
  \*****************************************/
/***/ function(module, exports) {

module.exports = function() {
	return "This text was generated by template A";
}

/***/ },
/* 3 */
/* unknown exports provided */
/* all exports used */
/*!*****************************************!*\
  !*** ../require.context/templates/b.js ***!
  \*****************************************/
/***/ function(module, exports) {

module.exports = function() {
	return "This text was generated by template B";
}

/***/ },
/* 4 */
/* unknown exports provided */
/* all exports used */
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
Hash: d11df36bfcb331710ba2
Version: webpack 2.2.0-rc.2
      Asset     Size  Chunks             Chunk Names
0.output.js  1.83 kB       0  [emitted]  
  output.js  6.07 kB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 463 bytes {1} [rendered]
    > [1] ./example.js 2:1-4:3
    [0] ../require.context/templates ^\.\/.*$ 217 bytes {0} [built]
        cjs require context ../require.context/templates [1] ./example.js 3:11-64
    [2] ../require.context/templates/a.js 82 bytes {0} [optional] [built]
        context element ./a [0] ../require.context/templates ^\.\/.*$
        context element ./a.js [0] ../require.context/templates ^\.\/.*$
    [3] ../require.context/templates/b.js 82 bytes {0} [optional] [built]
        context element ./b [0] ../require.context/templates ^\.\/.*$
        context element ./b.js [0] ../require.context/templates ^\.\/.*$
    [4] ../require.context/templates/c.js 82 bytes {0} [optional] [built]
        context element ./c [0] ../require.context/templates ^\.\/.*$
        context element ./c.js [0] ../require.context/templates ^\.\/.*$
chunk    {1} output.js (main) 276 bytes [entry] [rendered]
    > main [1] ./example.js 
    [1] ./example.js 276 bytes {1} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: d11df36bfcb331710ba2
Version: webpack 2.2.0-rc.2
      Asset       Size  Chunks             Chunk Names
0.output.js  544 bytes       0  [emitted]  
  output.js    1.51 kB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 463 bytes {1} [rendered]
    > [1] ./example.js 2:1-4:3
    [0] ../require.context/templates ^\.\/.*$ 217 bytes {0} [built]
        cjs require context ../require.context/templates [1] ./example.js 3:11-64
    [2] ../require.context/templates/a.js 82 bytes {0} [optional] [built]
        context element ./a [0] ../require.context/templates ^\.\/.*$
        context element ./a.js [0] ../require.context/templates ^\.\/.*$
    [3] ../require.context/templates/b.js 82 bytes {0} [optional] [built]
        context element ./b [0] ../require.context/templates ^\.\/.*$
        context element ./b.js [0] ../require.context/templates ^\.\/.*$
    [4] ../require.context/templates/c.js 82 bytes {0} [optional] [built]
        context element ./c [0] ../require.context/templates ^\.\/.*$
        context element ./c.js [0] ../require.context/templates ^\.\/.*$
chunk    {1} output.js (main) 276 bytes [entry] [rendered]
    > main [1] ./example.js 
    [1] ./example.js 276 bytes {1} [built]
```
