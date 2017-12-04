# example.js

This example illustrates how to leverage the `import()` syntax to create ContextModules which are separated into separate chunks for each module in the `./templates` folder.

``` javascript
async function getTemplate(templateName) {
	try {
		let template = await import(`./templates/${templateName}`);
		console.log(template);
	} catch(err) {
		console.error("template error");
		return new Error(err);
	}
}

getTemplate("foo");
getTemplate("bar");
getTemplate("baz");
```

# templates/

* foo.js
* baz.js
* bar.js

All templates are of this pattern:

``` javascript
var foo = "foo";

export default foo;
```

# js/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0], moreModules = data[1], executeModules = data[2];
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
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		3: 0
/******/ 	};
/******/
/******/ 	var scheduledModules = [];
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
/******/ 		var promises = [];
/******/
/******/
/******/ 		// JSONP chunk loading for javascript
/******/
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData !== 0) { // 0 means "already installed".
/******/
/******/ 			// a Promise means "currently loading".
/******/ 			if(installedChunkData) {
/******/ 				promises.push(installedChunkData[2]);
/******/ 			} else {
/******/ 				// setup Promise in chunk cache
/******/ 				var promise = new Promise(function(resolve, reject) {
/******/ 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 				});
/******/ 				promises.push(installedChunkData[2] = promise);
/******/
/******/ 				// start chunk loading
/******/ 				var head = document.getElementsByTagName('head')[0];
/******/ 				var script = document.createElement('script');
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120000;
/******/
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = __webpack_require__.p + "" + chunkId + ".output.js";
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				function onScriptComplete(event) {
/******/ 					// avoid mem leaks in IE.
/******/ 					script.onerror = script.onload = null;
/******/ 					clearTimeout(timeout);
/******/ 					var chunk = installedChunks[chunkId];
/******/ 					if(chunk !== 0) {
/******/ 						if(chunk) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							chunk[1](error);
/******/ 						}
/******/ 						installedChunks[chunkId] = undefined;
/******/ 					}
/******/ 				};
/******/ 				head.appendChild(script);
/******/ 			}
/******/ 		}
/******/ 		return Promise.all(promises);
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
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
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
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var parentJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

async function getTemplate(templateName) {
	try {
		let template = await __webpack_require__(/*! ./templates */ 4)(`./${templateName}`);
		console.log(template);
	} catch(err) {
		console.error("template error");
		return new Error(err);
	}
}

getTemplate("foo");
getTemplate("bar");
getTemplate("baz");




/***/ }),
/* 4 */
/*!**************************************************!*\
  !*** ./templates lazy ^\.\/.*$ namespace object ***!
  \**************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

var map = {
	"./bar": [
		0,
		2
	],
	"./bar.js": [
		0,
		2
	],
	"./baz": [
		1,
		1
	],
	"./baz.js": [
		1,
		1
	],
	"./foo": [
		2,
		0
	],
	"./foo.js": [
		2,
		0
	]
};
function webpackAsyncContext(req) {
	var ids = map[req];
	if(!ids)
		return Promise.resolve().then(function() { throw new Error("Cannot find module '" + req + "'."); });
	return __webpack_require__.e(ids[1]).then(function() {
		var module = __webpack_require__(ids[0]);
		return module;
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.id = 4;
module.exports = webpackAsyncContext;

/***/ })
/******/ ]);
```

# Info

## Uncompressed

```
Hash: c0e9c43fa1cecd7aab21
Version: webpack next
      Asset       Size  Chunks             Chunk Names
0.output.js  641 bytes       0  [emitted]  
1.output.js  647 bytes       1  [emitted]  
2.output.js  638 bytes       2  [emitted]  
  output.js   8.14 KiB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 41 bytes {3} [rendered]
    [2] ./templates/foo.js 41 bytes {0} [optional] [built]
        [exports: default]
        context element ./foo.js [4] ./templates lazy ^\.\/.*$ namespace object ./foo.js
        context element ./foo [4] ./templates lazy ^\.\/.*$ namespace object ./foo
chunk    {1} 1.output.js 41 bytes {3} [rendered]
    [1] ./templates/baz.js 41 bytes {1} [optional] [built]
        [exports: default]
        context element ./baz.js [4] ./templates lazy ^\.\/.*$ namespace object ./baz.js
        context element ./baz [4] ./templates lazy ^\.\/.*$ namespace object ./baz
chunk    {2} 2.output.js 41 bytes {3} [rendered]
    [0] ./templates/bar.js 41 bytes {2} [optional] [built]
        [exports: default]
        context element ./bar.js [4] ./templates lazy ^\.\/.*$ namespace object ./bar.js
        context element ./bar [4] ./templates lazy ^\.\/.*$ namespace object ./bar
chunk    {3} output.js (main) 456 bytes [entry] [rendered]
    > main [3] ./example.js 
    [3] ./example.js 296 bytes {3} [built]
        single entry .\example.js  main
    [4] ./templates lazy ^\.\/.*$ namespace object 160 bytes {3} [optional] [built]
        import() context lazy ./templates [3] ./example.js 3:23-60
```

## Minimized (uglify-js, no zip)

```
Hash: c0e9c43fa1cecd7aab21
Version: webpack next
 4 assets
Entrypoint main = output.js
chunk    {0} 0.output.js 41 bytes {3} [rendered]
    [2] ./templates/foo.js 41 bytes {0} [optional] [built]
        [exports: default]
        context element ./foo.js [4] ./templates lazy ^\.\/.*$ namespace object ./foo.js
        context element ./foo [4] ./templates lazy ^\.\/.*$ namespace object ./foo
chunk    {1} 1.output.js 41 bytes {3} [rendered]
    [1] ./templates/baz.js 41 bytes {1} [optional] [built]
        [exports: default]
        context element ./baz.js [4] ./templates lazy ^\.\/.*$ namespace object ./baz.js
        context element ./baz [4] ./templates lazy ^\.\/.*$ namespace object ./baz
chunk    {2} 2.output.js 41 bytes {3} [rendered]
    [0] ./templates/bar.js 41 bytes {2} [optional] [built]
        [exports: default]
        context element ./bar.js [4] ./templates lazy ^\.\/.*$ namespace object ./bar.js
        context element ./bar [4] ./templates lazy ^\.\/.*$ namespace object ./bar
chunk    {3} output.js (main) 456 bytes [entry] [rendered]
    > main [3] ./example.js 
    [3] ./example.js 296 bytes {3} [built]
        single entry .\example.js  main
    [4] ./templates lazy ^\.\/.*$ namespace object 160 bytes {3} [optional] [built]
        import() context lazy ./templates [3] ./example.js 3:23-60

ERROR in output.js from UglifyJs
Unexpected token: keyword (function) [output.js:176,6]
```
