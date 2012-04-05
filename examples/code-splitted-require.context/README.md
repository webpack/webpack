# example.js

``` javascript
function getTemplate(templateName, callback) {
	require.ensure([], function(require) {
		callback(require("../require.context/templates/"+templateName));
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
function getTemplate(templateName, callback) {
	require.ensure(1, function(require) {
		callback(require(/* ../require.context/templates */1)("./"+templateName));
	});
}
getTemplate("a", function(a) {
	console.log(a);
});
getTemplate("b", function(b) {
	console.log(b);
});
/******/ /* WEBPACK FREE VAR INJECTION */ }(require(/* __webpack_console */2)))

/******/},
/******/
/******/2: function(module, exports, require) {

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
/******/})
```

# Info

## Uncompressed

```
Chunks: 2
Modules: 6
Modules including duplicates: 6
Modules pre chunk: 3
Modules first chunk: 2
     output.js:     2707 characters
   1.output.js:      780 characters
output.js
    0 .\example.js
       main
    2 (webpack)\buildin\__webpack_console.js
       require (2x) from .\example.js
1.output.js
    1 [context] ..\require.context\templates
       sync context from .\example.js
    3 ..\require.context\templates\a.js
       sync context from .\example.js
    4 ..\require.context\templates\b.js
       sync context from .\example.js
    5 ..\require.context\templates\c.js
       sync context from .\example.js
```

## Minimized (uglify-js, no zip)

```
Chunks: 2
Modules: 6
Modules including duplicates: 6
Modules pre chunk: 3
Modules first chunk: 2
     output.js:     1062 characters
   1.output.js:      436 characters
output.js
    0 .\example.js
       main
    2 (webpack)\buildin\__webpack_console.js
       require (2x) from .\example.js
1.output.js
    1 [context] ..\require.context\templates
       sync context from .\example.js
    3 ..\require.context\templates\a.js
       sync context from .\example.js
    4 ..\require.context\templates\b.js
       sync context from .\example.js
    5 ..\require.context\templates\c.js
       sync context from .\example.js
```
