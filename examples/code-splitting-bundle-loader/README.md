# example.js

``` javascript
require("bundle!./file.js")(function(fileJsExports) {
	console.log(fileJsExports);
});
```

# file.js

``` javascript
module.exports = "It works";
```


# js/output.js

``` javascript
/******/(function(document, undefined) {
/******/	return function(modules) {
/******/		var installedModules = {}, installedChunks = {0:1};
/******/		function require(moduleId) {
/******/			if(typeof moduleId !== "number") throw new Error("Cannot find module '"+moduleId+"'");
/******/			if(installedModules[moduleId])
/******/				return installedModules[moduleId].exports;
/******/			var module = installedModules[moduleId] = {
/******/				exports: {}
/******/			};
/******/			modules[moduleId](module, module.exports, require);
/******/			return module.exports;
/******/		}
/******/		require.ensure = function(chunkId, callback) {
/******/			if(installedChunks[chunkId] === 1) return callback(require);
/******/			if(installedChunks[chunkId] !== undefined)
/******/				installedChunks[chunkId].push(callback);
/******/			else {
/******/				installedChunks[chunkId] = [callback];
/******/				var head = document.getElementsByTagName('head')[0];
/******/				var script = document.createElement('script');
/******/				script.type = 'text/javascript';
/******/				script.charset = 'utf-8';
/******/				script.src = modules.c+chunkId+modules.a;
/******/				head.appendChild(script);
/******/			}
/******/		};
/******/		require.modules = modules;
/******/		window[modules.b] = function(chunkId, moreModules) {
/******/			for(var moduleId in moreModules)
/******/				modules[moduleId] = moreModules[moduleId];
/******/			var callbacks = installedChunks[chunkId];
/******/			installedChunks[chunkId] = 1;
/******/			for(var i = 0; i < callbacks.length; i++)
/******/				callbacks[i](require);
/******/		};
/******/		return require(0);
/******/	}
/******/})(document)
/******/({a:".output.js",b:"webpackJsonp",c:"",
/******/0: function(module, exports, require) {

/******/ /* WEBPACK FREE VAR INJECTION */ (function(console) {
require(/* bundle!./file.js */3)(function(fileJsExports) {
	console.log(fileJsExports);
});
/******/ /* WEBPACK FREE VAR INJECTION */ }(require(/* __webpack_console */1)))

/******/},
/******/
/******/1: function(module, exports, require) {

var console = window.console;
module.exports = console;
for(var name in {log:1, info:1, error:1, warn:1, dir:1, trace:1, assert:1})
	if(!console[name])
		console[name] = function() {};
if(!console.time)
console.time = function(label) {
	times[label] = Date.now();
};
if(!console.timeEnd)
console.timeEnd = function() {
	var duration = Date.now() - times[label];
	console.log('%s: %dms', label, duration);
};

/******/},
/******/
/******/3: function(module, exports, require) {

var cbs = [], 
	data;
module.exports = function(cb) {
	if(cbs) cbs.push(cb);
	else cb(data);
}
require.ensure(1, function(require) {
	data = require(/* !.\file.js */2);
	var callbacks = cbs;
	cbs = null;
	for(var i = 0, l = callbacks.length; i < l; i++) {
		callbacks[i](data);
	}
});

/******/},
/******/
/******/})
```

# js/1.output.js

``` javascript
/******/webpackJsonp(1, {
/******/2: function(module, exports, require) {

module.exports = "It works";

/******/},
/******/
/******/})
```

# Info

## Uncompressed

```
Hash: d6f50f4b74e9f9ebe906d2a0d4f12e7f
Chunks: 2
Modules: 4
Modules including duplicates: 4
Modules pre chunk: 2
Modules first chunk: 3
   output.js:     2986 characters
 1.output.js:      135 characters

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0        93  .\example.js
       main
    1       420  (webpack)\buildin\__webpack_console.js
       require (1x) from .\example.js
    3       360  (webpack)\~\bundle-loader!.\file.js
       require (1x) from .\example.js
1.output.js
    2        28  .\file.js
       async require (1x) from .\file.js
```

## Minimized (uglify-js, no zip)

```
Hash: d6f50f4b74e9f9ebe906d2a0d4f12e7f
Chunks: 2
Modules: 4
Modules including duplicates: 4
Modules pre chunk: 2
Modules first chunk: 3
   output.js:     1143 characters
 1.output.js:       57 characters

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0        39  .\example.js
       main
    1       332  (webpack)\buildin\__webpack_console.js
       require (1x) from .\example.js
    3       169  (webpack)\~\bundle-loader!.\file.js
       require (1x) from .\example.js
1.output.js
    2        25  .\file.js
       async require (1x) from .\file.js
```
