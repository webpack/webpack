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
var webpack = require("../../");

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
	"source-map",
].map(devtool => ({
	entry: {
		bundle: "coffee-loader!./example.coffee",
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: `./[name]-${devtool}.js`,
	},
	devtool,
	plugins: [
		new webpack.optimize.CommonsChunkPlugin(["manifest"]),
	],
}));
```

# Generated source-maps

## source-map.js and source-map.js.map
``` javascript
webpackJsonp([0],[
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!**************************************************!*\
  !*** (webpack)/~/coffee-loader!./example.coffee ***!
  \**************************************************/
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
],[0]);
//# sourceMappingURL=bundle-source-map.js.map
```

``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n\n\n\n// WEBPACK FOOTER //\n// ./example.coffee"],"sourceRoot":""}
```

## hidden-source-map.js and hidden-source-map.js.map
``` javascript
webpackJsonp([0],[
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!**************************************************!*\
  !*** (webpack)/~/coffee-loader!./example.coffee ***!
  \**************************************************/
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
],[0]);
```

``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-hidden-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n\n\n\n// WEBPACK FOOTER //\n// ./example.coffee"],"sourceRoot":""}
```

## inline-source-map.js
``` javascript
webpackJsonp([0],[
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!**************************************************!*\
  !*** (webpack)/~/coffee-loader!./example.coffee ***!
  \**************************************************/
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
],[0]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFHQTtFQUFBOztBQUFBLE9BQ0U7RUFBQSxNQUFRLElBQUksQ0FBQyxJQUFiO0VBQ0EsUUFBUSxNQURSO0VBRUEsTUFBUSxTQUFDLENBQUQ7V0FBTyxJQUFJLE9BQU8sQ0FBUDtFQUFYLENBRlI7OztBQUtGLE9BQU87QUFDTDtFQURNLHVCQUFRO1NBQ2QsTUFBTSxNQUFOLEVBQWMsT0FBZDtBQURLIiwiZmlsZSI6Ii4vYnVuZGxlLWlubGluZS1zb3VyY2UtbWFwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIyBUYWtlbiBmcm9tIGh0dHA6Ly9jb2ZmZWVzY3JpcHQub3JnL1xuXG4jIE9iamVjdHM6XG5tYXRoID1cbiAgcm9vdDogICBNYXRoLnNxcnRcbiAgc3F1YXJlOiBzcXVhcmVcbiAgY3ViZTogICAoeCkgLT4geCAqIHNxdWFyZSB4XG5cbiMgU3BsYXRzOlxucmFjZSA9ICh3aW5uZXIsIHJ1bm5lcnMuLi4pIC0+XG4gIHByaW50IHdpbm5lciwgcnVubmVyc1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vZXhhbXBsZS5jb2ZmZWUiXSwic291cmNlUm9vdCI6IiJ9
```

## nosources-source-map.js.map
``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-nosources-source-map.js","sourceRoot":""}
```

## eval-source-map.js
``` javascript
webpackJsonp([0],[
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!**************************************************!*\
  !*** (webpack)/~/coffee-loader!./example.coffee ***!
  \**************************************************/
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZT85MWU1Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBO0VBQUE7O0FBQUEsT0FDRTtFQUFBLE1BQVEsSUFBSSxDQUFDLElBQWI7RUFDQSxRQUFRLE1BRFI7RUFFQSxNQUFRLFNBQUMsQ0FBRDtXQUFPLElBQUksT0FBTyxDQUFQO0VBQVgsQ0FGUjs7O0FBS0YsT0FBTztBQUNMO0VBRE0sdUJBQVE7U0FDZCxNQUFNLE1BQU4sRUFBYyxPQUFkO0FBREsiLCJmaWxlIjoiMC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiMgVGFrZW4gZnJvbSBodHRwOi8vY29mZmVlc2NyaXB0Lm9yZy9cblxuIyBPYmplY3RzOlxubWF0aCA9XG4gIHJvb3Q6ICAgTWF0aC5zcXJ0XG4gIHNxdWFyZTogc3F1YXJlXG4gIGN1YmU6ICAgKHgpIC0+IHggKiBzcXVhcmUgeFxuXG4jIFNwbGF0czpcbnJhY2UgPSAod2lubmVyLCBydW5uZXJzLi4uKSAtPlxuICBwcmludCB3aW5uZXIsIHJ1bm5lcnNcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL2V4YW1wbGUuY29mZmVlIl0sInNvdXJjZVJvb3QiOiIifQ==");

/***/ })
],[0]);
```

## eval.js
``` javascript
webpackJsonp([0],[
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!**************************************************!*\
  !*** (webpack)/~/coffee-loader!./example.coffee ***!
  \**************************************************/
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n\n\n//////////////////\n// WEBPACK FOOTER\n// (webpack)/~/coffee-loader!./example.coffee\n// module id = 0\n// module chunks = 0\n\n//# sourceURL=webpack:///./example.coffee?(webpack)/~/coffee-loader");

/***/ })
],[0]);
```

## cheap-eval-source-map.js
``` javascript
webpackJsonp([0],[
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!**************************************************!*\
  !*** (webpack)/~/coffee-loader!./example.coffee ***!
  \**************************************************/
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlPzkzZTEiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIG1hdGgsIHJhY2UsXG4gIHNsaWNlID0gW10uc2xpY2U7XG5cbm1hdGggPSB7XG4gIHJvb3Q6IE1hdGguc3FydCxcbiAgc3F1YXJlOiBzcXVhcmUsXG4gIGN1YmU6IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4geCAqIHNxdWFyZSh4KTtcbiAgfVxufTtcblxucmFjZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcnVubmVycywgd2lubmVyO1xuICB3aW5uZXIgPSBhcmd1bWVudHNbMF0sIHJ1bm5lcnMgPSAyIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgOiBbXTtcbiAgcmV0dXJuIHByaW50KHdpbm5lciwgcnVubmVycyk7XG59O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gKHdlYnBhY2spL34vY29mZmVlLWxvYWRlciEuL2V4YW1wbGUuY29mZmVlXG4vLyBtb2R1bGUgaWQgPSAwXG4vLyBtb2R1bGUgY2h1bmtzID0gMCJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Iiwic291cmNlUm9vdCI6IiJ9");

/***/ })
],[0]);
```

## cheap-module-eval-source-map.js
``` javascript
webpackJsonp([0],[
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!**************************************************!*\
  !*** (webpack)/~/coffee-loader!./example.coffee ***!
  \**************************************************/
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlPzkxZTUiXSwic291cmNlc0NvbnRlbnQiOlsiIyBUYWtlbiBmcm9tIGh0dHA6Ly9jb2ZmZWVzY3JpcHQub3JnL1xuXG4jIE9iamVjdHM6XG5tYXRoID1cbiAgcm9vdDogICBNYXRoLnNxcnRcbiAgc3F1YXJlOiBzcXVhcmVcbiAgY3ViZTogICAoeCkgLT4geCAqIHNxdWFyZSB4XG5cbiMgU3BsYXRzOlxucmFjZSA9ICh3aW5uZXIsIHJ1bm5lcnMuLi4pIC0+XG4gIHByaW50IHdpbm5lciwgcnVubmVyc1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vZXhhbXBsZS5jb2ZmZWUiXSwibWFwcGluZ3MiOiJBQUdBO0FBQUE7QUFDQTtBQURBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFBQTs7O0FBR0E7QUFDQTtBQURBO0FBQ0E7QUFEQTsiLCJzb3VyY2VSb290IjoiIn0=");

/***/ })
],[0]);
```

## cheap-module-source-map.js.map
``` javascript
{"version":3,"file":"./bundle-cheap-module-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n\n\n\n// WEBPACK FOOTER //\n// ./example.coffee"],"mappings":";;;;;;;;;AAGA;AAAA;AACA;AADA;AACA;AACA;AACA;AAAA;AAAA;;;AAGA;AACA;AADA;AACA;AADA;;;;A","sourceRoot":""}
```

## cheap-source-map.js.map
``` javascript
{"version":3,"file":"./bundle-cheap-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n\n\n\n//////////////////\n// WEBPACK FOOTER\n// (webpack)/~/coffee-loader!./example.coffee\n// module id = 0\n// module chunks = 0"],"mappings":";;;;;;;;;AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;;;A","sourceRoot":""}
```

# webpack output

```
Hash: e1eee77b6825ec38ac89465a726503b90d318f915f9e187528736f9dd586ad053259eb9ee4cf69b5354b67e68d715d903c312f2150aa82ec45caa3f79d388dea6bd43ac605cdd4e103e888cf20eaf6f75dc2d2924e3fdc22d6889086c1479edc2c87f028
Version: webpack 2.3.3
Child
    Hash: e1eee77b6825ec38ac89
                                  Asset     Size  Chunks             Chunk Names
      ./bundle-cheap-eval-source-map.js  1.58 kB       0  [emitted]  bundle
    ./manifest-cheap-eval-source-map.js  5.88 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-cheap-eval-source-map.js ./bundle-cheap-eval-source-map.js
    chunk    {0} ./bundle-cheap-eval-source-map.js (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/~/coffee-loader!./example.coffee 
        [0] (webpack)/~/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-cheap-eval-source-map.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 465a726503b90d318f91
                                         Asset     Size  Chunks             Chunk Names
      ./bundle-cheap-module-eval-source-map.js  1.29 kB       0  [emitted]  bundle
    ./manifest-cheap-module-eval-source-map.js  5.88 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-cheap-module-eval-source-map.js ./bundle-cheap-module-eval-source-map.js
    chunk    {0} ./bundle-cheap-module-eval-source-map.js (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/~/coffee-loader!./example.coffee 
        [0] (webpack)/~/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-cheap-module-eval-source-map.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 5f9e187528736f9dd586
                                        Asset       Size  Chunks             Chunk Names
          ./bundle-cheap-module-source-map.js  669 bytes       0  [emitted]  bundle
        ./manifest-cheap-module-source-map.js    5.94 kB       1  [emitted]  manifest
      ./bundle-cheap-module-source-map.js.map  485 bytes       0  [emitted]  bundle
    ./manifest-cheap-module-source-map.js.map    5.97 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-cheap-module-source-map.js ./manifest-cheap-module-source-map.js.map ./bundle-cheap-module-source-map.js ./bundle-cheap-module-source-map.js.map
    chunk    {0} ./bundle-cheap-module-source-map.js, ./bundle-cheap-module-source-map.js.map (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/~/coffee-loader!./example.coffee 
        [0] (webpack)/~/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-cheap-module-source-map.js, ./manifest-cheap-module-source-map.js.map (manifest) 0 bytes [entry] [rendered]
Child
    Hash: ad053259eb9ee4cf69b5
                                 Asset       Size  Chunks             Chunk Names
          ./bundle-cheap-source-map.js  662 bytes       0  [emitted]  bundle
        ./manifest-cheap-source-map.js    5.93 kB       1  [emitted]  manifest
      ./bundle-cheap-source-map.js.map  692 bytes       0  [emitted]  bundle
    ./manifest-cheap-source-map.js.map    5.95 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-cheap-source-map.js ./manifest-cheap-source-map.js.map ./bundle-cheap-source-map.js ./bundle-cheap-source-map.js.map
    chunk    {0} ./bundle-cheap-source-map.js, ./bundle-cheap-source-map.js.map (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/~/coffee-loader!./example.coffee 
        [0] (webpack)/~/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-cheap-source-map.js, ./manifest-cheap-source-map.js.map (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 354b67e68d715d903c31
                 Asset       Size  Chunks             Chunk Names
      ./bundle-eval.js  834 bytes       0  [emitted]  bundle
    ./manifest-eval.js    5.86 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-eval.js ./bundle-eval.js
    chunk    {0} ./bundle-eval.js (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/~/coffee-loader!./example.coffee 
        [0] (webpack)/~/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-eval.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 2f2150aa82ec45caa3f7
                            Asset     Size  Chunks             Chunk Names
      ./bundle-eval-source-map.js  1.44 kB       0  [emitted]  bundle
    ./manifest-eval-source-map.js  5.87 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-eval-source-map.js ./bundle-eval-source-map.js
    chunk    {0} ./bundle-eval-source-map.js (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/~/coffee-loader!./example.coffee 
        [0] (webpack)/~/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-eval-source-map.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 9d388dea6bd43ac605cd
                                  Asset       Size  Chunks             Chunk Names
          ./bundle-hidden-source-map.js  610 bytes       0  [emitted]  bundle
        ./manifest-hidden-source-map.js    5.87 kB       1  [emitted]  manifest
      ./bundle-hidden-source-map.js.map  582 bytes       0  [emitted]  bundle
    ./manifest-hidden-source-map.js.map       6 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-hidden-source-map.js ./manifest-hidden-source-map.js.map ./bundle-hidden-source-map.js ./bundle-hidden-source-map.js.map
    chunk    {0} ./bundle-hidden-source-map.js, ./bundle-hidden-source-map.js.map (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/~/coffee-loader!./example.coffee 
        [0] (webpack)/~/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-hidden-source-map.js, ./manifest-hidden-source-map.js.map (manifest) 0 bytes [entry] [rendered]
Child
    Hash: d4e103e888cf20eaf6f7
                              Asset     Size  Chunks             Chunk Names
      ./bundle-inline-source-map.js  1.45 kB       0  [emitted]  bundle
    ./manifest-inline-source-map.js  13.9 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-inline-source-map.js ./bundle-inline-source-map.js
    chunk    {0} ./bundle-inline-source-map.js (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/~/coffee-loader!./example.coffee 
        [0] (webpack)/~/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-inline-source-map.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 5dc2d2924e3fdc22d688
                                     Asset       Size  Chunks             Chunk Names
          ./bundle-nosources-source-map.js  666 bytes       0  [emitted]  bundle
        ./manifest-nosources-source-map.js    5.93 kB       1  [emitted]  manifest
      ./bundle-nosources-source-map.js.map  315 bytes       0  [emitted]  bundle
    ./manifest-nosources-source-map.js.map  936 bytes       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-nosources-source-map.js ./manifest-nosources-source-map.js.map ./bundle-nosources-source-map.js ./bundle-nosources-source-map.js.map
    chunk    {0} ./bundle-nosources-source-map.js, ./bundle-nosources-source-map.js.map (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/~/coffee-loader!./example.coffee 
        [0] (webpack)/~/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-nosources-source-map.js, ./manifest-nosources-source-map.js.map (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 9086c1479edc2c87f028
                           Asset       Size  Chunks             Chunk Names
          ./bundle-source-map.js  656 bytes       0  [emitted]  bundle
        ./manifest-source-map.js    5.91 kB       1  [emitted]  manifest
      ./bundle-source-map.js.map  575 bytes       0  [emitted]  bundle
    ./manifest-source-map.js.map    5.98 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-source-map.js ./manifest-source-map.js.map ./bundle-source-map.js ./bundle-source-map.js.map
    chunk    {0} ./bundle-source-map.js, ./bundle-source-map.js.map (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/~/coffee-loader!./example.coffee 
        [0] (webpack)/~/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-source-map.js, ./manifest-source-map.js.map (manifest) 0 bytes [entry] [rendered]
```
