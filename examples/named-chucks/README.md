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

/*** .\example.js ***/

var a = require(/* a */1);

require.e(2, function(require) {
	// a named chuck
	var c = require(/* c */4);
}, /* my own chuck */0);

require.e(2, function(require) {
	// another chuck with the same name
	var d = require(/* d */3);
}, /* my own chuck */0);

require.e(2, function(require) {
	// the same again
}, /* my own chuck */0);

require.e(1, function(require) {
	// chuck without name
	var d = require(/* d */3);
});

/******/},
/******/
/******/1: function(module, exports, require) {

/*** .\~\a.js ***/

// module a

/******/},
/******/
/******/})
```

# js/1.output.js

``` javascript
/******/webpackJsonp(1, {
/******/2: function(module, exports, require) {

/*** .\~\b.js ***/

// module b

/******/},
/******/
/******/3: function(module, exports, require) {

/*** .\~\d.js ***/

// module d

/******/},
/******/
/******/})
```

# js/2.output.js

``` javascript
/******/webpackJsonp(2, {
/******/2: function(module, exports, require) {

/*** .\~\b.js ***/

// module b

/******/},
/******/
/******/3: function(module, exports, require) {

/*** .\~\d.js ***/

// module d

/******/},
/******/
/******/4: function(module, exports, require) {

/*** .\~\c.js ***/

// module c

/******/},
/******/
/******/})
```

# Info

## Uncompressed

```
Hash: e8a5188136febe5f240b1f8cbc74cf2b
Compile Time: 48ms
Chunks: 3
Modules: 5
Modules including duplicates: 7
Modules first chunk: 2
        main     output.js:     2524 chars/bytes 
           1   1.output.js:      240 chars/bytes 
my own chuck   2.output.js:      342 chars/bytes 

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0       441  .\example.js
       main
    1        11  .\~\a.js
       require (1x) from .\example.js
1.output.js
    2        11  .\~\b.js
       async require (3x) from .\example.js
    3        11  .\~\d.js
       async require (2x) from .\example.js
2.output.js
    2        11  .\~\b.js
       async require (3x) from .\example.js
    3        11  .\~\d.js
       async require (2x) from .\example.js
    4        11  .\~\c.js
       async require (1x) from .\example.js
```
