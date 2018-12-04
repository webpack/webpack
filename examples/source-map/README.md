This example demonstrates various types of source-maps.

# example.coffee

``` coffeescript
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

``` javascript
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
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

var math, race,
  slice = [].slice;

math = {
  root: Math.sqrt,
  square: square,
  cube: function(x) {
    return x * square(x);
  }
};

race = function() {
  var runners, winner;
  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  return print(winner, runners);
};


/***/ })
],[[0,0]]]);
//# sourceMappingURL=bundle-source-map.js.map
```

``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"sourceRoot":""}
```

## hidden-source-map.js and hidden-source-map.js.map
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

var math, race,
  slice = [].slice;

math = {
  root: Math.sqrt,
  square: square,
  cube: function(x) {
    return x * square(x);
  }
};

race = function() {
  var runners, winner;
  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  return print(winner, runners);
};


/***/ })
],[[0,0]]]);
```

``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-hidden-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"sourceRoot":""}
```

## inline-source-map.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

var math, race,
  slice = [].slice;

math = {
  root: Math.sqrt,
  square: square,
  cube: function(x) {
    return x * square(x);
  }
};

race = function() {
  var runners, winner;
  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  return print(winner, runners);
};


/***/ })
],[[0,0]]]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUdBO0VBQUE7O0FBQUEsT0FDRTtFQUFBLE1BQVEsSUFBSSxDQUFDLElBQWI7RUFDQSxRQUFRLE1BRFI7RUFFQSxNQUFRLFNBQUMsQ0FBRDtXQUFPLElBQUksT0FBTyxDQUFQO0VBQVgsQ0FGUjs7O0FBS0YsT0FBTztBQUNMO0VBRE0sdUJBQVE7U0FDZCxNQUFNLE1BQU4sRUFBYyxPQUFkO0FBREsiLCJmaWxlIjoiLi9idW5kbGUtaW5saW5lLXNvdXJjZS1tYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIjIFRha2VuIGZyb20gaHR0cDovL2NvZmZlZXNjcmlwdC5vcmcvXG5cbiMgT2JqZWN0czpcbm1hdGggPVxuICByb290OiAgIE1hdGguc3FydFxuICBzcXVhcmU6IHNxdWFyZVxuICBjdWJlOiAgICh4KSAtPiB4ICogc3F1YXJlIHhcblxuIyBTcGxhdHM6XG5yYWNlID0gKHdpbm5lciwgcnVubmVycy4uLikgLT5cbiAgcHJpbnQgd2lubmVyLCBydW5uZXJzXG4iXSwic291cmNlUm9vdCI6IiJ9
```

## nosources-source-map.js.map
``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-nosources-source-map.js","sourceRoot":""}
```

## eval-source-map.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZT8yNDE2Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBO0VBQUE7O0FBQUEsT0FDRTtFQUFBLE1BQVEsSUFBSSxDQUFDLElBQWI7RUFDQSxRQUFRLE1BRFI7RUFFQSxNQUFRLFNBQUMsQ0FBRDtXQUFPLElBQUksT0FBTyxDQUFQO0VBQVgsQ0FGUjs7O0FBS0YsT0FBTztBQUNMO0VBRE0sdUJBQVE7U0FDZCxNQUFNLE1BQU4sRUFBYyxPQUFkO0FBREsiLCJmaWxlIjoiMC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiMgVGFrZW4gZnJvbSBodHRwOi8vY29mZmVlc2NyaXB0Lm9yZy9cblxuIyBPYmplY3RzOlxubWF0aCA9XG4gIHJvb3Q6ICAgTWF0aC5zcXJ0XG4gIHNxdWFyZTogc3F1YXJlXG4gIGN1YmU6ICAgKHgpIC0+IHggKiBzcXVhcmUgeFxuXG4jIFNwbGF0czpcbnJhY2UgPSAod2lubmVyLCBydW5uZXJzLi4uKSAtPlxuICBwcmludCB3aW5uZXIsIHJ1bm5lcnNcbiJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[[0,0]]]);
```

## eval.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n\n\n//# sourceURL=webpack:///./example.coffee?(webpack)/node_modules/coffee-loader");

/***/ })
],[[0,0]]]);
```

## cheap-eval-source-map.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlP2MxNzAiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIG1hdGgsIHJhY2UsXG4gIHNsaWNlID0gW10uc2xpY2U7XG5cbm1hdGggPSB7XG4gIHJvb3Q6IE1hdGguc3FydCxcbiAgc3F1YXJlOiBzcXVhcmUsXG4gIGN1YmU6IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4geCAqIHNxdWFyZSh4KTtcbiAgfVxufTtcblxucmFjZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcnVubmVycywgd2lubmVyO1xuICB3aW5uZXIgPSBhcmd1bWVudHNbMF0sIHJ1bm5lcnMgPSAyIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgOiBbXTtcbiAgcmV0dXJuIHByaW50KHdpbm5lciwgcnVubmVycyk7XG59O1xuIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTsiLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[[0,0]]]);
```

## cheap-module-eval-source-map.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlPzI0MTYiXSwic291cmNlc0NvbnRlbnQiOlsiIyBUYWtlbiBmcm9tIGh0dHA6Ly9jb2ZmZWVzY3JpcHQub3JnL1xuXG4jIE9iamVjdHM6XG5tYXRoID1cbiAgcm9vdDogICBNYXRoLnNxcnRcbiAgc3F1YXJlOiBzcXVhcmVcbiAgY3ViZTogICAoeCkgLT4geCAqIHNxdWFyZSB4XG5cbiMgU3BsYXRzOlxucmFjZSA9ICh3aW5uZXIsIHJ1bm5lcnMuLi4pIC0+XG4gIHByaW50IHdpbm5lciwgcnVubmVyc1xuIl0sIm1hcHBpbmdzIjoiQUFHQTtBQUFBO0FBQ0E7QUFEQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQUE7OztBQUdBO0FBQ0E7QUFEQTtBQUNBO0FBREE7Iiwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[[0,0]]]);
```

## cheap-module-source-map.js.map
``` javascript
{"version":3,"file":"./bundle-cheap-module-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"mappings":";;;;;;;;AAGA;AAAA;AACA;AADA;AACA;AACA;AACA;AAAA;AAAA;;;AAGA;AACA;AADA;AACA;AADA;;;;A","sourceRoot":""}
```

## cheap-source-map.js.map
``` javascript
{"version":3,"file":"./bundle-cheap-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n"],"mappings":";;;;;;;;AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;;;A","sourceRoot":""}
```

# webpack output

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.20.1
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                        Asset      Size  Chunks             Chunk Names
    ./runtime~bundle-cheap-eval-source-map.js  6.04 KiB       0  [emitted]  runtime~bundle
            ./bundle-cheap-eval-source-map.js   1.5 KiB       1  [emitted]  bundle
    Entrypoint bundle = ./runtime~bundle-cheap-eval-source-map.js ./bundle-cheap-eval-source-map.js
    chunk    {0} ./runtime~bundle-cheap-eval-source-map.js (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-cheap-eval-source-map.js (bundle) 308 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                               Asset      Size  Chunks             Chunk Names
    ./runtime~bundle-cheap-module-eval-source-map.js  6.04 KiB       0  [emitted]  runtime~bundle
            ./bundle-cheap-module-eval-source-map.js  1.33 KiB       1  [emitted]  bundle
    Entrypoint bundle = ./runtime~bundle-cheap-module-eval-source-map.js ./bundle-cheap-module-eval-source-map.js
    chunk    {0} ./runtime~bundle-cheap-module-eval-source-map.js (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-cheap-module-eval-source-map.js (bundle) 308 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                              Asset       Size  Chunks             Chunk Names
        ./runtime~bundle-cheap-module-source-map.js   6.11 KiB       0  [emitted]  runtime~bundle
                ./bundle-cheap-module-source-map.js  733 bytes       1  [emitted]  bundle
    ./runtime~bundle-cheap-module-source-map.js.map      6 KiB       0  [emitted]  runtime~bundle
            ./bundle-cheap-module-source-map.js.map  437 bytes       1  [emitted]  bundle
    Entrypoint bundle = ./runtime~bundle-cheap-module-source-map.js ./runtime~bundle-cheap-module-source-map.js.map ./bundle-cheap-module-source-map.js ./bundle-cheap-module-source-map.js.map
    chunk    {0} ./runtime~bundle-cheap-module-source-map.js, ./runtime~bundle-cheap-module-source-map.js.map (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-cheap-module-source-map.js, ./bundle-cheap-module-source-map.js.map (bundle) 308 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                       Asset       Size  Chunks             Chunk Names
        ./runtime~bundle-cheap-source-map.js    6.1 KiB       0  [emitted]  runtime~bundle
                ./bundle-cheap-source-map.js  726 bytes       1  [emitted]  bundle
    ./runtime~bundle-cheap-source-map.js.map      6 KiB       0  [emitted]  runtime~bundle
            ./bundle-cheap-source-map.js.map  561 bytes       1  [emitted]  bundle
    Entrypoint bundle = ./runtime~bundle-cheap-source-map.js ./runtime~bundle-cheap-source-map.js.map ./bundle-cheap-source-map.js ./bundle-cheap-source-map.js.map
    chunk    {0} ./runtime~bundle-cheap-source-map.js, ./runtime~bundle-cheap-source-map.js.map (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-cheap-source-map.js, ./bundle-cheap-source-map.js.map (bundle) 308 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                       Asset       Size  Chunks             Chunk Names
    ./runtime~bundle-eval.js   6.04 KiB       0  [emitted]  runtime~bundle
            ./bundle-eval.js  781 bytes       1  [emitted]  bundle
    Entrypoint bundle = ./runtime~bundle-eval.js ./bundle-eval.js
    chunk    {0} ./runtime~bundle-eval.js (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-eval.js (bundle) 308 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                  Asset      Size  Chunks             Chunk Names
    ./runtime~bundle-eval-source-map.js  6.04 KiB       0  [emitted]  runtime~bundle
            ./bundle-eval-source-map.js  1.47 KiB       1  [emitted]  bundle
    Entrypoint bundle = ./runtime~bundle-eval-source-map.js ./bundle-eval-source-map.js
    chunk    {0} ./runtime~bundle-eval-source-map.js (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-eval-source-map.js (bundle) 308 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                        Asset       Size  Chunks             Chunk Names
        ./runtime~bundle-hidden-source-map.js   6.04 KiB       0  [emitted]  runtime~bundle
                ./bundle-hidden-source-map.js  674 bytes       1  [emitted]  bundle
    ./runtime~bundle-hidden-source-map.js.map   6.09 KiB       0  [emitted]  runtime~bundle
            ./bundle-hidden-source-map.js.map  534 bytes       1  [emitted]  bundle
    Entrypoint bundle = ./runtime~bundle-hidden-source-map.js ./runtime~bundle-hidden-source-map.js.map ./bundle-hidden-source-map.js ./bundle-hidden-source-map.js.map
    chunk    {0} ./runtime~bundle-hidden-source-map.js, ./runtime~bundle-hidden-source-map.js.map (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-hidden-source-map.js, ./bundle-hidden-source-map.js.map (bundle) 308 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                    Asset      Size  Chunks             Chunk Names
    ./runtime~bundle-inline-source-map.js  14.2 KiB       0  [emitted]  runtime~bundle
            ./bundle-inline-source-map.js  1.42 KiB       1  [emitted]  bundle
    Entrypoint bundle = ./runtime~bundle-inline-source-map.js ./bundle-inline-source-map.js
    chunk    {0} ./runtime~bundle-inline-source-map.js (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-inline-source-map.js (bundle) 308 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                           Asset       Size  Chunks             Chunk Names
        ./runtime~bundle-nosources-source-map.js    6.1 KiB       0  [emitted]  runtime~bundle
                ./bundle-nosources-source-map.js  730 bytes       1  [emitted]  bundle
    ./runtime~bundle-nosources-source-map.js.map  981 bytes       0  [emitted]  runtime~bundle
            ./bundle-nosources-source-map.js.map  314 bytes       1  [emitted]  bundle
    Entrypoint bundle = ./runtime~bundle-nosources-source-map.js ./runtime~bundle-nosources-source-map.js.map ./bundle-nosources-source-map.js ./bundle-nosources-source-map.js.map
    chunk    {0} ./runtime~bundle-nosources-source-map.js, ./runtime~bundle-nosources-source-map.js.map (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-nosources-source-map.js, ./bundle-nosources-source-map.js.map (bundle) 308 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                 Asset       Size  Chunks             Chunk Names
        ./runtime~bundle-source-map.js   6.09 KiB       0  [emitted]  runtime~bundle
                ./bundle-source-map.js  720 bytes       1  [emitted]  bundle
    ./runtime~bundle-source-map.js.map   6.08 KiB       0  [emitted]  runtime~bundle
            ./bundle-source-map.js.map  527 bytes       1  [emitted]  bundle
    Entrypoint bundle = ./runtime~bundle-source-map.js ./runtime~bundle-source-map.js.map ./bundle-source-map.js ./bundle-source-map.js.map
    chunk    {0} ./runtime~bundle-source-map.js, ./runtime~bundle-source-map.js.map (runtime~bundle) 0 bytes ={1}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
    chunk    {1} ./bundle-source-map.js, ./bundle-source-map.js.map (bundle) 308 bytes ={0}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {1} [built]
         single entry coffee-loader!./example.coffee  bundle
```
