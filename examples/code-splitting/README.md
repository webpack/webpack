# example.js

``` javascript
var a = require("a");
var b = require("b");
require.ensure(["c"], function(require) {
    require("b").xyz();
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

var a = require(/* a */2);
var b = require(/* b */1);
require.e(1, function(require) {
    require(/* b */1).xyz();
    var d = require(/* d */4);
});

/******/},
/******/
/******/1: function(module, exports, require) {

/*** .\~\b.js ***/

// module b

/******/},
/******/
/******/2: function(module, exports, require) {

/*** .\~\a.js ***/

// module a

/******/},
/******/
/******/})
```

# js/1.output.js

``` javascript
/******/webpackJsonp(1, {
/******/3: function(module, exports, require) {

/*** .\~\c.js ***/

// module c

/******/},
/******/
/******/4: function(module, exports, require) {

/*** .\~\d.js ***/

// module d

/******/},
/******/
/******/})
```

Minimized

``` javascript
webpackJsonp(1,{3:function(a,b,c){},4:function(a,b,c){}})
```

# Info

## Uncompressed

```
Hash: 38f36e791a78bd79a3da8a151e3eca69
Compile Time: 50ms
Chunks: 2
Modules: 5
Modules including duplicates: 5
Modules per chunk: 2.5
Modules first chunk: 3
   output.js:     2206 characters
 1.output.js:      240 characters

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0       150  .\example.js
       main
    1        11  .\~\b.js
       require (2x) from .\example.js
    2        11  .\~\a.js
       require (1x) from .\example.js
1.output.js
    3        11  .\~\c.js
       async require (1x) from .\example.js
    4        11  .\~\d.js
       async require (1x) from .\example.js
```

## Minimized (uglify-js, no zip)

```
Hash: acb96ffb60e2a4a3abff7ff64fc7b104
Compile Time: 105ms
Chunks: 2
Modules: 5
Modules including duplicates: 5
Modules per chunk: 2.5
Modules first chunk: 3
   output.js:      759 characters
 1.output.js:       57 characters

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0        77  .\example.js
       main
    1         0  .\~\b.js
       require (2x) from .\example.js
    2         0  .\~\a.js
       require (1x) from .\example.js
1.output.js
    3         0  .\~\c.js
       async require (1x) from .\example.js
    4         0  .\~\d.js
       async require (1x) from .\example.js
```
