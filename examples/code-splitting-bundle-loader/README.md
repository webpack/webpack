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
/******/				exports: {},
/******/				id: moduleId,
/******/				loaded: false
/******/			};
/******/			modules[moduleId](module, module.exports, require);
/******/			module.loaded = true;
/******/			return module.exports;
/******/		}
/******/		require.e = function(chunkId, callback) {
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
/******/		require.cache = installedModules;
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

/**! .\example.js !**/

/******/ /* WEBPACK FREE VAR INJECTION */ (function(console) {
require(/*! bundle!./file.js */2)(function(fileJsExports) {
	console.log(fileJsExports);
});
/******/ /* WEBPACK FREE VAR INJECTION */ }(require(/*! __webpack_console */1)))

/******/},
/******/
/******/1: function(module, exports, require) {

/**! (webpack)\buildin\__webpack_console.js !**/

var console = (function() { return this["console"] || (this["window"] && this["window"].console) || {} }());
module.exports = console;
for(var name in {log:1, info:1, error:1, warn:1, dir:1, trace:1, assert:1})
	if(!console[name])
		console[name] = function() {};
var times = {};
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
/******/2: function(module, exports, require) {

/**! (webpack)\~\bundle-loader!.\file.js !**/

var cbs = [], 
	data;
module.exports = function(cb) {
	if(cbs) cbs.push(cb);
	else cb(data);
}
require.e(1, function(require) {
	data = require(/*! !.\file.js */3);
	var callbacks = cbs;
	cbs = null;
	for(var i = 0, l = callbacks.length; i < l; i++) {
		callbacks[i](data);
	}
});

/******/}
/******/})
```

# js/1.output.js

``` javascript
/******/webpackJsonp(1,{
/******/3: function(module, exports, require) {

/**! .\file.js !**/

module.exports = "It works";

/******/}
/******/})
```

# Info

## Uncompressed

```
Hash: 578af2d2eeef37e82cc9e8248511201d
Compile Time: 53ms
Chunks: 2
Modules: 4
Modules including duplicates: 4
Modules first chunk: 3
main     output.js:     3303 chars/bytes
       1.output.js:      145 chars/bytes

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0        92  .\example.js
       main
    1       502  (webpack)\buildin\__webpack_console.js
       require (1x) from .\example.js
    2       398  (webpack)\~\bundle-loader!.\file.js
       require (1x) from .\example.js
1.output.js
    3        28  .\file.js
       async require (1x) from .\file.js
```

## Minimized (uglify-js, no zip)

```
Hash: 5e7ee4f471c7ea9d20a78d163e3645da
Compile Time: 254ms
Chunks: 2
Modules: 4
Modules including duplicates: 4
Modules first chunk: 3
main     output.js:     1221 chars/bytes
       1.output.js:       54 chars/bytes

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0        40  .\example.js
       main
    1       403  (webpack)\buildin\__webpack_console.js
       require (1x) from .\example.js
    2       165  (webpack)\~\bundle-loader!.\file.js
       require (1x) from .\example.js
1.output.js
    3        26  .\file.js
       async require (1x) from .\file.js
```

## Graph

![webpack-graph](http://webpack.github.com/webpack/examples/code-splitting-bundle-loader/graph.svg)
