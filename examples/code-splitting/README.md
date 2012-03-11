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

var a = require(1);
var b = require(2);
require.ensure(1, function(require) {
    require(2).xyz();
    var d = require(3);
});

/******/},
/******/
/******/1: function(module, exports, require) {

// module a

/******/},
/******/
/******/2: function(module, exports, require) {

// module b

/******/},
/******/
/******/})
```

# 1.output.js

``` javascript
/******/webpackJsonp(1, {
/******/3: function(module, exports, require) {

// module d

/******/},
/******/
/******/4: function(module, exports, require) {

// module c

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

``` javascript
{ chunkCount: 2,
  modulesCount: 5,
  modulesIncludingDuplicates: 5,
  modulesPerChunk: 2.5,
  modulesFirstChunk: 3,
  fileSizes: { 'output.js': 1948, '1.output.js': 200 } }
```

## Minimized (uglify-js, no zip)

``` javascript
{ chunkCount: 2,
  modulesCount: 5,
  modulesIncludingDuplicates: 5,
  modulesPerChunk: 2.5,
  modulesFirstChunk: 3,
  fileSizes: { 'output.js': 661, '1.output.js': 57 } }
```
