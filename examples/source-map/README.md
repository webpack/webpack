This example demonstrates various types of source-maps.

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
	"cheap-eval-source-map",
	"cheap-module-eval-source-map",
	"cheap-module-source-map",
	"cheap-source-map",
	"eval",
	"eval-source-map",
	"hidden-source-map",
	"inline-source-map",
	"nosources-source-map",
	"source-map"
].map(devtool => ({
	mode: "development",
	entry: {
		bundle: "coffee-loader!./example.coffee"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: `./[name]-${devtool}.js`
	},
	devtool,
	optimization: {
		runtimeChunk: true
	}
}));
```

# Generated source-maps

## source-map.js and source-map.js.map

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
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

## hidden-source-map.js and hidden-source-map.js.map

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
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
```

```javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;AAAA;;;AAAA;;AAGA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX;AAFR,EAJF;;;AASA,OAAO,SAAC,MAAD,KAAS,OAAT;SACL,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-hidden-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"sourceRoot":""}
```

## inline-source-map.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7QUFBQTs7QUFHQSxPQUNFO0VBQUEsTUFBUSxJQUFJLENBQUMsSUFBYjtFQUNBLFFBQVEsTUFEUjtFQUVBLE1BQVEsU0FBQyxDQUFEO1dBQU8sSUFBSSxPQUFPLENBQVA7RUFBWDtBQUZSLEVBSkY7OztBQVNBLE9BQU8sU0FBQyxNQUFELEtBQVMsT0FBVDtTQUNMLE1BQU0sTUFBTixFQUFjLE9BQWQ7QUFESyIsImZpbGUiOiIuL2J1bmRsZS1pbmxpbmUtc291cmNlLW1hcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiMgVGFrZW4gZnJvbSBodHRwOi8vY29mZmVlc2NyaXB0Lm9yZy9cblxuIyBPYmplY3RzOlxubWF0aCA9XG4gIHJvb3Q6ICAgTWF0aC5zcXJ0XG4gIHNxdWFyZTogc3F1YXJlXG4gIGN1YmU6ICAgKHgpIC0+IHggKiBzcXVhcmUgeFxuXG4jIFNwbGF0czpcbnJhY2UgPSAod2lubmVyLCBydW5uZXJzLi4uKSAtPlxuICBwcmludCB3aW5uZXIsIHJ1bm5lcnNcbiJdLCJzb3VyY2VSb290IjoiIn0=
```

## nosources-source-map.js.map

```javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;AAAA;;;AAAA;;AAGA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX;AAFR,EAJF;;;AASA,OAAO,SAAC,MAAD,KAAS,OAAT;SACL,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-nosources-source-map.js","sourceRoot":""}
```

## eval-source-map.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZT8yNDE2Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUFBQTs7QUFHQSxPQUNFO0VBQUEsTUFBUSxJQUFJLENBQUMsSUFBYjtFQUNBLFFBQVEsTUFEUjtFQUVBLE1BQVEsU0FBQyxDQUFEO1dBQU8sSUFBSSxPQUFPLENBQVA7RUFBWDtBQUZSLEVBSkY7OztBQVNBLE9BQU8sU0FBQyxNQUFELEtBQVMsT0FBVDtTQUNMLE1BQU0sTUFBTixFQUFjLE9BQWQ7QUFESyIsImZpbGUiOiIwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIyBUYWtlbiBmcm9tIGh0dHA6Ly9jb2ZmZWVzY3JpcHQub3JnL1xuXG4jIE9iamVjdHM6XG5tYXRoID1cbiAgcm9vdDogICBNYXRoLnNxcnRcbiAgc3F1YXJlOiBzcXVhcmVcbiAgY3ViZTogICAoeCkgLT4geCAqIHNxdWFyZSB4XG5cbiMgU3BsYXRzOlxucmFjZSA9ICh3aW5uZXIsIHJ1bm5lcnMuLi4pIC0+XG4gIHByaW50IHdpbm5lciwgcnVubmVyc1xuIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[[0,0]]]);
```

## eval.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n\n\n//# sourceURL=webpack:///./example.coffee?(webpack)/node_modules/coffee-loader");

/***/ })
],[[0,0]]]);
```

## cheap-eval-source-map.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlP2MxNzAiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gVGFrZW4gZnJvbSBodHRwOi8vY29mZmVlc2NyaXB0Lm9yZy9cblxuLy8gT2JqZWN0czpcbnZhciBtYXRoLCByYWNlO1xuXG5tYXRoID0ge1xuICByb290OiBNYXRoLnNxcnQsXG4gIHNxdWFyZTogc3F1YXJlLFxuICBjdWJlOiBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHggKiBzcXVhcmUoeCk7XG4gIH1cbn07XG5cbi8vIFNwbGF0czpcbnJhY2UgPSBmdW5jdGlvbih3aW5uZXIsIC4uLnJ1bm5lcnMpIHtcbiAgcmV0dXJuIHByaW50KHdpbm5lciwgcnVubmVycyk7XG59O1xuIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOyIsInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[[0,0]]]);
```

## cheap-module-eval-source-map.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlPzI0MTYiXSwic291cmNlc0NvbnRlbnQiOlsiIyBUYWtlbiBmcm9tIGh0dHA6Ly9jb2ZmZWVzY3JpcHQub3JnL1xuXG4jIE9iamVjdHM6XG5tYXRoID1cbiAgcm9vdDogICBNYXRoLnNxcnRcbiAgc3F1YXJlOiBzcXVhcmVcbiAgY3ViZTogICAoeCkgLT4geCAqIHNxdWFyZSB4XG5cbiMgU3BsYXRzOlxucmFjZSA9ICh3aW5uZXIsIHJ1bm5lcnMuLi4pIC0+XG4gIHByaW50IHdpbm5lciwgcnVubmVyc1xuIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBOztBQURBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQUE7QUFGQTtBQUNBOztBQUlBO0FBQ0E7QUFEQTsiLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[[0,0]]]);
```

## cheap-module-source-map.js.map

```javascript
{"version":3,"file":"./bundle-cheap-module-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"mappings":";;;;;;;;AAAA;AACA;;AADA;AACA;AAEA;AACA;AACA;AACA;AAAA;AAAA;AAFA;AACA;;AAIA;AACA;AADA;;;;A","sourceRoot":""}
```

## cheap-source-map.js.map

```javascript
{"version":3,"file":"./bundle-cheap-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n"],"mappings":";;;;;;;;AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;;;A","sourceRoot":""}
```

# webpack output

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                        Asset      Size  Chunks             Chunk Names
            ./bundle-cheap-eval-source-map.js  1.39 KiB       1  [emitted]  bundle
    ./runtime~bundle-cheap-eval-source-map.js  6.11 KiB       0  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-cheap-eval-source-map.js ./bundle-cheap-eval-source-map.js
    chunk    {0} ./runtime~bundle-cheap-eval-source-map.js (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-cheap-eval-source-map.js (bundle) 256 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 256 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                               Asset      Size  Chunks             Chunk Names
            ./bundle-cheap-module-eval-source-map.js  1.28 KiB       1  [emitted]  bundle
    ./runtime~bundle-cheap-module-eval-source-map.js  6.11 KiB       0  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-cheap-module-eval-source-map.js ./bundle-cheap-module-eval-source-map.js
    chunk    {0} ./runtime~bundle-cheap-module-eval-source-map.js (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-cheap-module-eval-source-map.js (bundle) 256 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 256 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                              Asset       Size  Chunks             Chunk Names
                ./bundle-cheap-module-source-map.js  681 bytes       1  [emitted]  bundle
            ./bundle-cheap-module-source-map.js.map  442 bytes       1  [emitted]  bundle
        ./runtime~bundle-cheap-module-source-map.js   6.18 KiB       0  [emitted]  runtime~bundle
    ./runtime~bundle-cheap-module-source-map.js.map   6.07 KiB       0  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-cheap-module-source-map.js ./runtime~bundle-cheap-module-source-map.js.map ./bundle-cheap-module-source-map.js ./bundle-cheap-module-source-map.js.map
    chunk    {0} ./runtime~bundle-cheap-module-source-map.js, ./runtime~bundle-cheap-module-source-map.js.map (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-cheap-module-source-map.js, ./bundle-cheap-module-source-map.js.map (bundle) 256 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 256 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                       Asset       Size  Chunks             Chunk Names
                ./bundle-cheap-source-map.js  674 bytes       1  [emitted]  bundle
            ./bundle-cheap-source-map.js.map  515 bytes       1  [emitted]  bundle
        ./runtime~bundle-cheap-source-map.js   6.17 KiB       0  [emitted]  runtime~bundle
    ./runtime~bundle-cheap-source-map.js.map   6.07 KiB       0  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-cheap-source-map.js ./runtime~bundle-cheap-source-map.js.map ./bundle-cheap-source-map.js ./bundle-cheap-source-map.js.map
    chunk    {0} ./runtime~bundle-cheap-source-map.js, ./runtime~bundle-cheap-source-map.js.map (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-cheap-source-map.js, ./bundle-cheap-source-map.js.map (bundle) 256 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 256 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                       Asset       Size  Chunks             Chunk Names
            ./bundle-eval.js  730 bytes       1  [emitted]  bundle
    ./runtime~bundle-eval.js   6.11 KiB       0  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-eval.js ./bundle-eval.js
    chunk    {0} ./runtime~bundle-eval.js (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-eval.js (bundle) 256 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 256 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                  Asset      Size  Chunks             Chunk Names
            ./bundle-eval-source-map.js  1.43 KiB       1  [emitted]  bundle
    ./runtime~bundle-eval-source-map.js  6.11 KiB       0  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-eval-source-map.js ./bundle-eval-source-map.js
    chunk    {0} ./runtime~bundle-eval-source-map.js (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-eval-source-map.js (bundle) 256 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 256 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                        Asset       Size  Chunks             Chunk Names
                ./bundle-hidden-source-map.js  622 bytes       1  [emitted]  bundle
            ./bundle-hidden-source-map.js.map  545 bytes       1  [emitted]  bundle
        ./runtime~bundle-hidden-source-map.js   6.11 KiB       0  [emitted]  runtime~bundle
    ./runtime~bundle-hidden-source-map.js.map   6.16 KiB       0  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-hidden-source-map.js ./runtime~bundle-hidden-source-map.js.map ./bundle-hidden-source-map.js ./bundle-hidden-source-map.js.map
    chunk    {0} ./runtime~bundle-hidden-source-map.js, ./runtime~bundle-hidden-source-map.js.map (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-hidden-source-map.js, ./bundle-hidden-source-map.js.map (bundle) 256 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 256 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                    Asset      Size  Chunks             Chunk Names
            ./bundle-inline-source-map.js  1.38 KiB       1  [emitted]  bundle
    ./runtime~bundle-inline-source-map.js  14.4 KiB       0  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-inline-source-map.js ./bundle-inline-source-map.js
    chunk    {0} ./runtime~bundle-inline-source-map.js (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-inline-source-map.js (bundle) 256 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 256 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                           Asset       Size  Chunks             Chunk Names
                ./bundle-nosources-source-map.js  678 bytes       1  [emitted]  bundle
            ./bundle-nosources-source-map.js.map  325 bytes       1  [emitted]  bundle
        ./runtime~bundle-nosources-source-map.js   6.18 KiB       0  [emitted]  runtime~bundle
    ./runtime~bundle-nosources-source-map.js.map  981 bytes       0  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-nosources-source-map.js ./runtime~bundle-nosources-source-map.js.map ./bundle-nosources-source-map.js ./bundle-nosources-source-map.js.map
    chunk    {0} ./runtime~bundle-nosources-source-map.js, ./runtime~bundle-nosources-source-map.js.map (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-nosources-source-map.js, ./bundle-nosources-source-map.js.map (bundle) 256 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 256 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                 Asset       Size  Chunks             Chunk Names
                ./bundle-source-map.js  668 bytes       1  [emitted]  bundle
            ./bundle-source-map.js.map  538 bytes       1  [emitted]  bundle
        ./runtime~bundle-source-map.js   6.17 KiB       0  [emitted]  runtime~bundle
    ./runtime~bundle-source-map.js.map   6.15 KiB       0  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-source-map.js ./runtime~bundle-source-map.js.map ./bundle-source-map.js ./bundle-source-map.js.map
    chunk    {0} ./runtime~bundle-source-map.js, ./runtime~bundle-source-map.js.map (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-source-map.js, ./bundle-source-map.js.map (bundle) 256 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 256 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
```
