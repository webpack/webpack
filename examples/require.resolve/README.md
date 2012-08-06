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
/******/			exports: {}
/******/		};
/******/		modules[moduleId](module, module.exports, require);
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

/*** .\example.js ***/

var a = require(/* ./a */1);

// get module id
var aId = (/* ./a.js */1);

// clear module in require.cache
delete require.cache[aId];

// require module again, it should be reexecuted
var a2 = require(/* ./a */1);

// vertify it
if(a == a2) throw new Error("Cache clear failed :(");

/******/},
/******/
/******/1: function(module, exports, require) {

/*** .\a.js ***/

module.exports = Math.random();

/******/},
/******/
/******/})
```

# Info

## Uncompressed

```
Hash: 8c012745533a08a15f1e6f422f4b96f8
Compile Time: 21ms
Chunks: 1
Modules: 2
Modules including duplicates: 2
Modules per chunk: 2
Modules first chunk: 2
   output.js:     1225 characters

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0       283  .\example.js
       main
    1        31  .\a.js
       require (2x) from .\example.js
       require (1x) from .\example.js
```

## Minimized (uglify-js, no zip)

```
Hash: bb8c15c0f6816c382b20abadbda51c0d
Compile Time: 66ms
Chunks: 1
Modules: 2
Modules including duplicates: 2
Modules per chunk: 2
Modules first chunk: 2
   output.js:      415 characters

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0       116  .\example.js
       main
    1        28  .\a.js
       require (2x) from .\example.js
       require (1x) from .\example.js
```
