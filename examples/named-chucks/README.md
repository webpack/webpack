# example.js

``` javascript
var a = require("a");

require.ensure(["b"], function(require) {
	// a named chuck
	var c = require("c");
}, "my own chuck");

require.ensure(["b"], function(require) {
	// another chuck with the same name
	var d = require("d");
}, "my own chuck");

require.ensure([], function(require) {
	// the same again
}, "my own chuck");

require.ensure(["b"], function(require) {
	// chuck without name
	var d = require("d");
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

var a = require(/* a */3);

require.ensure(2, function(require) {
	// a named chuck
	var c = require(/* c */4);
}, /* my own chuck */0);

require.ensure(2, function(require) {
	// another chuck with the same name
	var d = require(/* d */2);
}, /* my own chuck */0);

require.ensure(2, function(require) {
	// the same again
}, /* my own chuck */0);

require.ensure(1, function(require) {
	// chuck without name
	var d = require(/* d */2);
});

/******/},
/******/
/******/3: function(module, exports, require) {

// module a

/******/},
/******/
/******/})
```

# js/1.output.js

``` javascript
/******/webpackJsonp(1, {
/******/1: function(module, exports, require) {

// module b

/******/},
/******/
/******/2: function(module, exports, require) {

// module d

/******/},
/******/
/******/})
```

# js/2.output.js

``` javascript
/******/webpackJsonp(2, {
/******/1: function(module, exports, require) {

// module b

/******/},
/******/
/******/2: function(module, exports, require) {

// module d

/******/},
/******/
/******/4: function(module, exports, require) {

// module c

/******/},
/******/
/******/})
```

# Info

## Uncompressed

```
Hash: c34ada3b77659fd95fec2420fcfbe923
Chunks: 3
Modules: 5
Modules including duplicates: 7
Modules pre chunk: 2.3
Modules first chunk: 2
   output.js:     2371 characters
 1.output.js:      200 characters
 2.output.js:      282 characters

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0       461  .\example.js
       main
    3        11  .\~\a.js
       require (1x) from .\example.js
1.output.js
    1        11  .\~\b.js
       async require (3x) from .\example.js
    2        11  .\~\d.js
       async require (2x) from .\example.js
2.output.js
    1        11  .\~\b.js
       async require (3x) from .\example.js
    2        11  .\~\d.js
       async require (2x) from .\example.js
    4        11  .\~\c.js
       async require (1x) from .\example.js
```
