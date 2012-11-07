# example.js

``` javascript
var a = require("./a");

// get module id
var aId = require.resolve("./a.js");

// clear module in require.cache
delete require.cache[aId];

// require module again, it should be reexecuted
var a2 = require("./a");

// vertify it
if(a == a2) throw new Error("Cache clear failed :(");
```

# a.js


``` javascript
module.exports = Math.random();
```

# js/output.js

``` javascript
/******/(function(modules) {
/******/	var installedModules = {};
/******/	function require(moduleId) {
/******/		if(typeof moduleId !== "number") throw new Error("Cannot find module '"+moduleId+"'");
/******/		if(installedModules[moduleId])
/******/			return installedModules[moduleId].exports;
/******/		var module = installedModules[moduleId] = {
/******/			exports: {},
/******/			id: moduleId,
/******/			loaded: false
/******/		};
/******/		modules[moduleId](module, module.exports, require);
/******/		module.loaded = true;
/******/		return module.exports;
/******/	}
/******/	require.e = function(chunkId, callback) {
/******/		callback(require);
/******/	};
/******/	require.modules = modules;
/******/	require.cache = installedModules;
/******/	return require(0);
/******/})
/******/({c:"",
/******/0: function(module, exports, require) {

/**! .\example.js !**/

var a = require(/*! ./a */1);

// get module id
var aId = (/*! ./a.js */1);

// clear module in require.cache
delete require.cache[aId];

// require module again, it should be reexecuted
var a2 = require(/*! ./a */1);

// vertify it
if(a == a2) throw new Error("Cache clear failed :(");

/******/},
/******/
/******/1: function(module, exports, require) {

/**! .\a.js !**/

module.exports = Math.random();

/******/}
/******/})
```

# Info

## Uncompressed

```
Hash: df30902a418a948159ac2acfb6d7aad0
Compile Time: 21ms
Chunks: 1
Modules: 2
Modules including duplicates: 2
Modules first chunk: 2
main   output.js:     1301 chars/bytes

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0       286  .\example.js
       main
    1        31  .\a.js
       require (2x) from .\example.js
       require (1x) from .\example.js
```

## Minimized (uglify-js, no zip)

```
Hash: 3e7997ad1d37f38ab08fa290b9b2f638
Compile Time: 157ms
Chunks: 1
Modules: 2
Modules including duplicates: 2
Modules first chunk: 2
main   output.js:      431 chars/bytes

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0       113  .\example.js
       main
    1        29  .\a.js
       require (2x) from .\example.js
       require (1x) from .\example.js
```
