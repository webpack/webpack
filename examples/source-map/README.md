This example is an generic project of source-maps.

# example.coffee

```coffeescript
# Taken from http://coffeescript.org/

# Objects:
math =
  root:   Math.sqrt
  square: square
  cube:   (x) -> x * square x

# Splats:
race = (winner, runners...) ->
  print winner, runners
```

# webpack.config.js

```javascript
var path = require("path");

module.exports = [
	{
		mode: "development",
		entry: {
			bundle: "coffee-loader!./example.coffee"
		},
		output: {
			path: path.join(__dirname, "dist"),
			filename: "./[name]-cheap-eval-source-map.js"
		},
		// cheap-eval-source-map build fast to support development.
		devtool: "cheap-eval-source-map",
		optimization: {
			runtimeChunk: true
		}
	},
	{
		mode: "production",
		entry: {
			bundle: "coffee-loader!./example.coffee"
		},
		output: {
			path: path.join(__dirname, "dist"),
			filename: "./[name]-source-map.js"
		},
		// source-map is full emitted as a separate file, but your server disallow access to the source map.
		devtool: "source-map",
		optimization: {
			runtimeChunk: true
		}
	}
];
```

# Generated source-maps

## development mode

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!**********************************************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \**********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlP2Y5OTQiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gVGFrZW4gZnJvbSBodHRwOi8vY29mZmVlc2NyaXB0Lm9yZy9cblxuLy8gT2JqZWN0czpcbnZhciBtYXRoLCByYWNlO1xuXG5tYXRoID0ge1xuICByb290OiBNYXRoLnNxcnQsXG4gIHNxdWFyZTogc3F1YXJlLFxuICBjdWJlOiBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHggKiBzcXVhcmUoeCk7XG4gIH1cbn07XG5cbi8vIFNwbGF0czpcbnJhY2UgPSBmdW5jdGlvbih3aW5uZXIsIC4uLnJ1bm5lcnMpIHtcbiAgcmV0dXJuIHByaW50KHdpbm5lciwgcnVubmVycyk7XG59O1xuIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOyIsInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[[0,0]]]);
```

## production mode

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!**********************************************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \**********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

// Taken from http://coffeescript.org/

// Objects:
var math, race;

math = {
  root: Math.sqrt,
  square: square,
  cube: function(x) {
    return x * square(x);
  }
};

// Splats:
race = function(winner, ...runners) {
  return print(winner, runners);
};


/***/ })
],[[0,0]]]);
//# sourceMappingURL=bundle-source-map.js.map
```

```javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;AAAA;;;AAAA;;AAGA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX;AAFR,EAJF;;;AASA,OAAO,SAAC,MAAD,KAAS,OAAT;SACL,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"sourceRoot":""}
```

# webpack output

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.23.1
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                        Asset      Size  Chunks             Chunk Names
            ./bundle-cheap-eval-source-map.js  1.49 KiB       1  [emitted]  bundle
    ./runtime~bundle-cheap-eval-source-map.js  6.04 KiB       0  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-cheap-eval-source-map.js ./bundle-cheap-eval-source-map.js
    chunk    {0} ./runtime~bundle-cheap-eval-source-map.js (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-cheap-eval-source-map.js (bundle) 256 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 256 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                 Asset       Size  Chunks             Chunk Names
                ./bundle-source-map.js  767 bytes       1  [emitted]  bundle
            ./bundle-source-map.js.map  538 bytes       1  [emitted]  bundle
        ./runtime~bundle-source-map.js   6.09 KiB       0  [emitted]  runtime~bundle
    ./runtime~bundle-source-map.js.map   6.08 KiB       0  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-source-map.js ./runtime~bundle-source-map.js.map ./bundle-source-map.js ./bundle-source-map.js.map
    chunk    {0} ./runtime~bundle-source-map.js, ./runtime~bundle-source-map.js.map (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-source-map.js, ./bundle-source-map.js.map (bundle) 256 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 256 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
```
