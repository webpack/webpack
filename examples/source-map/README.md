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
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/*! all exports used */
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
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\r\n\r\n# Objects:\r\nmath =\r\n  root:   Math.sqrt\r\n  square: square\r\n  cube:   (x) -> x * square x\r\n\r\n# Splats:\r\nrace = (winner, runners...) ->\r\n  print winner, runners\r\n\n\n\n// WEBPACK FOOTER //\n// ./example.coffee"],"sourceRoot":""}
```

## hidden-source-map.js and hidden-source-map.js.map
``` javascript
webpackJsonp([0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/*! all exports used */
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
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-hidden-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\r\n\r\n# Objects:\r\nmath =\r\n  root:   Math.sqrt\r\n  square: square\r\n  cube:   (x) -> x * square x\r\n\r\n# Splats:\r\nrace = (winner, runners...) ->\r\n  print winner, runners\r\n\n\n\n// WEBPACK FOOTER //\n// ./example.coffee"],"sourceRoot":""}
```

## inline-source-map.js
``` javascript
webpackJsonp([0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/*! all exports used */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFHQTtFQUFBOztBQUFBLE9BQ0U7RUFBQSxNQUFRLElBQUksQ0FBQyxJQUFiO0VBQ0EsUUFBUSxNQURSO0VBRUEsTUFBUSxTQUFDLENBQUQ7V0FBTyxJQUFJLE9BQU8sQ0FBUDtFQUFYLENBRlI7OztBQUtGLE9BQU87QUFDTDtFQURNLHVCQUFRO1NBQ2QsTUFBTSxNQUFOLEVBQWMsT0FBZDtBQURLIiwiZmlsZSI6Ii4vYnVuZGxlLWlubGluZS1zb3VyY2UtbWFwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIyBUYWtlbiBmcm9tIGh0dHA6Ly9jb2ZmZWVzY3JpcHQub3JnL1xyXG5cclxuIyBPYmplY3RzOlxyXG5tYXRoID1cclxuICByb290OiAgIE1hdGguc3FydFxyXG4gIHNxdWFyZTogc3F1YXJlXHJcbiAgY3ViZTogICAoeCkgLT4geCAqIHNxdWFyZSB4XHJcblxyXG4jIFNwbGF0czpcclxucmFjZSA9ICh3aW5uZXIsIHJ1bm5lcnMuLi4pIC0+XHJcbiAgcHJpbnQgd2lubmVyLCBydW5uZXJzXHJcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL2V4YW1wbGUuY29mZmVlIl0sInNvdXJjZVJvb3QiOiIifQ==
```

## nosources-source-map.js.map
``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-nosources-source-map.js","sourceRoot":""}
```

## eval-source-map.js
``` javascript
webpackJsonp([0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZT85MWU1Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBO0VBQUE7O0FBQUEsT0FDRTtFQUFBLE1BQVEsSUFBSSxDQUFDLElBQWI7RUFDQSxRQUFRLE1BRFI7RUFFQSxNQUFRLFNBQUMsQ0FBRDtXQUFPLElBQUksT0FBTyxDQUFQO0VBQVgsQ0FGUjs7O0FBS0YsT0FBTztBQUNMO0VBRE0sdUJBQVE7U0FDZCxNQUFNLE1BQU4sRUFBYyxPQUFkO0FBREsiLCJmaWxlIjoiMC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiMgVGFrZW4gZnJvbSBodHRwOi8vY29mZmVlc2NyaXB0Lm9yZy9cclxuXHJcbiMgT2JqZWN0czpcclxubWF0aCA9XHJcbiAgcm9vdDogICBNYXRoLnNxcnRcclxuICBzcXVhcmU6IHNxdWFyZVxyXG4gIGN1YmU6ICAgKHgpIC0+IHggKiBzcXVhcmUgeFxyXG5cclxuIyBTcGxhdHM6XHJcbnJhY2UgPSAod2lubmVyLCBydW5uZXJzLi4uKSAtPlxyXG4gIHByaW50IHdpbm5lciwgcnVubmVyc1xyXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9leGFtcGxlLmNvZmZlZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[0]);
```

## eval.js
``` javascript
webpackJsonp([0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n\n\n//////////////////\n// WEBPACK FOOTER\n// (webpack)/node_modules/coffee-loader!./example.coffee\n// module id = 0\n// module chunks = 0\n\n//# sourceURL=webpack:///./example.coffee?(webpack)/node_modules/coffee-loader");

/***/ })
],[0]);
```

## cheap-eval-source-map.js
``` javascript
webpackJsonp([0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlPzA5MjciXSwic291cmNlc0NvbnRlbnQiOlsidmFyIG1hdGgsIHJhY2UsXG4gIHNsaWNlID0gW10uc2xpY2U7XG5cbm1hdGggPSB7XG4gIHJvb3Q6IE1hdGguc3FydCxcbiAgc3F1YXJlOiBzcXVhcmUsXG4gIGN1YmU6IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4geCAqIHNxdWFyZSh4KTtcbiAgfVxufTtcblxucmFjZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcnVubmVycywgd2lubmVyO1xuICB3aW5uZXIgPSBhcmd1bWVudHNbMF0sIHJ1bm5lcnMgPSAyIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgOiBbXTtcbiAgcmV0dXJuIHByaW50KHdpbm5lciwgcnVubmVycyk7XG59O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gKHdlYnBhY2spL25vZGVfbW9kdWxlcy9jb2ZmZWUtbG9hZGVyIS4vZXhhbXBsZS5jb2ZmZWVcbi8vIG1vZHVsZSBpZCA9IDBcbi8vIG1vZHVsZSBjaHVua3MgPSAwIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTsiLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[0]);
```

## cheap-module-eval-source-map.js
``` javascript
webpackJsonp([0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlPzkxZTUiXSwic291cmNlc0NvbnRlbnQiOlsiIyBUYWtlbiBmcm9tIGh0dHA6Ly9jb2ZmZWVzY3JpcHQub3JnL1xyXG5cclxuIyBPYmplY3RzOlxyXG5tYXRoID1cclxuICByb290OiAgIE1hdGguc3FydFxyXG4gIHNxdWFyZTogc3F1YXJlXHJcbiAgY3ViZTogICAoeCkgLT4geCAqIHNxdWFyZSB4XHJcblxyXG4jIFNwbGF0czpcclxucmFjZSA9ICh3aW5uZXIsIHJ1bm5lcnMuLi4pIC0+XHJcbiAgcHJpbnQgd2lubmVyLCBydW5uZXJzXHJcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL2V4YW1wbGUuY29mZmVlIl0sIm1hcHBpbmdzIjoiQUFHQTtBQUFBO0FBQ0E7QUFEQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQUE7OztBQUdBO0FBQ0E7QUFEQTtBQUNBO0FBREE7Iiwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[0]);
```

## cheap-module-source-map.js.map
``` javascript
{"version":3,"file":"./bundle-cheap-module-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["# Taken from http://coffeescript.org/\r\n\r\n# Objects:\r\nmath =\r\n  root:   Math.sqrt\r\n  square: square\r\n  cube:   (x) -> x * square x\r\n\r\n# Splats:\r\nrace = (winner, runners...) ->\r\n  print winner, runners\r\n\n\n\n// WEBPACK FOOTER //\n// ./example.coffee"],"mappings":";;;;;;;;;AAGA;AAAA;AACA;AADA;AACA;AACA;AACA;AAAA;AAAA;;;AAGA;AACA;AADA;AACA;AADA;;;;A","sourceRoot":""}
```

## cheap-source-map.js.map
``` javascript
{"version":3,"file":"./bundle-cheap-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n\n\n\n//////////////////\n// WEBPACK FOOTER\n// (webpack)/node_modules/coffee-loader!./example.coffee\n// module id = 0\n// module chunks = 0"],"mappings":";;;;;;;;;AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;;;A","sourceRoot":""}
```

# webpack output

```
Hash: 6ee996e84863368c38e521284f8d1d322741045b5f9e187528736f9dd586ad053259eb9ee4cf69b5354b67e68d715d903c31515124d263f93c8aa7159d388dea6bd43ac605cdd4e103e888cf20eaf6f75dc2d2924e3fdc22d6889086c1479edc2c87f028
Version: webpack 3.5.1
Child
    Hash: 6ee996e84863368c38e5
                                  Asset     Size  Chunks             Chunk Names
      ./bundle-cheap-eval-source-map.js  1.69 kB       0  [emitted]  bundle
    ./manifest-cheap-eval-source-map.js   5.8 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-cheap-eval-source-map.js ./bundle-cheap-eval-source-map.js
    chunk    {0} ./bundle-cheap-eval-source-map.js (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/node_modules/coffee-loader!./example.coffee 
        [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-cheap-eval-source-map.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 21284f8d1d322741045b
                                         Asset     Size  Chunks             Chunk Names
      ./bundle-cheap-module-eval-source-map.js  1.42 kB       0  [emitted]  bundle
    ./manifest-cheap-module-eval-source-map.js  5.81 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-cheap-module-eval-source-map.js ./bundle-cheap-module-eval-source-map.js
    chunk    {0} ./bundle-cheap-module-eval-source-map.js (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/node_modules/coffee-loader!./example.coffee 
        [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-cheap-module-eval-source-map.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 5f9e187528736f9dd586
                                        Asset       Size  Chunks             Chunk Names
          ./bundle-cheap-module-source-map.js  703 bytes       0  [emitted]  bundle
        ./manifest-cheap-module-source-map.js    5.87 kB       1  [emitted]  manifest
      ./bundle-cheap-module-source-map.js.map  507 bytes       0  [emitted]  bundle
    ./manifest-cheap-module-source-map.js.map     5.9 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-cheap-module-source-map.js ./manifest-cheap-module-source-map.js.map ./bundle-cheap-module-source-map.js ./bundle-cheap-module-source-map.js.map
    chunk    {0} ./bundle-cheap-module-source-map.js, ./bundle-cheap-module-source-map.js.map (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/node_modules/coffee-loader!./example.coffee 
        [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-cheap-module-source-map.js, ./manifest-cheap-module-source-map.js.map (manifest) 0 bytes [entry] [rendered]
Child
    Hash: ad053259eb9ee4cf69b5
                                 Asset       Size  Chunks             Chunk Names
          ./bundle-cheap-source-map.js  696 bytes       0  [emitted]  bundle
        ./manifest-cheap-source-map.js    5.85 kB       1  [emitted]  manifest
      ./bundle-cheap-source-map.js.map  703 bytes       0  [emitted]  bundle
    ./manifest-cheap-source-map.js.map    5.88 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-cheap-source-map.js ./manifest-cheap-source-map.js.map ./bundle-cheap-source-map.js ./bundle-cheap-source-map.js.map
    chunk    {0} ./bundle-cheap-source-map.js, ./bundle-cheap-source-map.js.map (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/node_modules/coffee-loader!./example.coffee 
        [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-cheap-source-map.js, ./manifest-cheap-source-map.js.map (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 354b67e68d715d903c31
                 Asset       Size  Chunks             Chunk Names
      ./bundle-eval.js  890 bytes       0  [emitted]  bundle
    ./manifest-eval.js    5.79 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-eval.js ./bundle-eval.js
    chunk    {0} ./bundle-eval.js (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/node_modules/coffee-loader!./example.coffee 
        [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-eval.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 515124d263f93c8aa715
                            Asset     Size  Chunks             Chunk Names
      ./bundle-eval-source-map.js  1.56 kB       0  [emitted]  bundle
    ./manifest-eval-source-map.js   5.8 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-eval-source-map.js ./bundle-eval-source-map.js
    chunk    {0} ./bundle-eval-source-map.js (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/node_modules/coffee-loader!./example.coffee 
        [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-eval-source-map.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 9d388dea6bd43ac605cd
                                  Asset       Size  Chunks             Chunk Names
          ./bundle-hidden-source-map.js  644 bytes       0  [emitted]  bundle
        ./manifest-hidden-source-map.js     5.8 kB       1  [emitted]  manifest
      ./bundle-hidden-source-map.js.map  604 bytes       0  [emitted]  bundle
    ./manifest-hidden-source-map.js.map    5.93 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-hidden-source-map.js ./manifest-hidden-source-map.js.map ./bundle-hidden-source-map.js ./bundle-hidden-source-map.js.map
    chunk    {0} ./bundle-hidden-source-map.js, ./bundle-hidden-source-map.js.map (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/node_modules/coffee-loader!./example.coffee 
        [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-hidden-source-map.js, ./manifest-hidden-source-map.js.map (manifest) 0 bytes [entry] [rendered]
Child
    Hash: d4e103e888cf20eaf6f7
                              Asset     Size  Chunks             Chunk Names
      ./bundle-inline-source-map.js  1.52 kB       0  [emitted]  bundle
    ./manifest-inline-source-map.js  13.8 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-inline-source-map.js ./bundle-inline-source-map.js
    chunk    {0} ./bundle-inline-source-map.js (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/node_modules/coffee-loader!./example.coffee 
        [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-inline-source-map.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 5dc2d2924e3fdc22d688
                                     Asset       Size  Chunks             Chunk Names
          ./bundle-nosources-source-map.js  700 bytes       0  [emitted]  bundle
        ./manifest-nosources-source-map.js    5.86 kB       1  [emitted]  manifest
      ./bundle-nosources-source-map.js.map  315 bytes       0  [emitted]  bundle
    ./manifest-nosources-source-map.js.map  935 bytes       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-nosources-source-map.js ./manifest-nosources-source-map.js.map ./bundle-nosources-source-map.js ./bundle-nosources-source-map.js.map
    chunk    {0} ./bundle-nosources-source-map.js, ./bundle-nosources-source-map.js.map (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/node_modules/coffee-loader!./example.coffee 
        [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-nosources-source-map.js, ./manifest-nosources-source-map.js.map (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 9086c1479edc2c87f028
                           Asset       Size  Chunks             Chunk Names
          ./bundle-source-map.js  690 bytes       0  [emitted]  bundle
        ./manifest-source-map.js    5.84 kB       1  [emitted]  manifest
      ./bundle-source-map.js.map  597 bytes       0  [emitted]  bundle
    ./manifest-source-map.js.map    5.92 kB       1  [emitted]  manifest
    Entrypoint bundle = ./manifest-source-map.js ./manifest-source-map.js.map ./bundle-source-map.js ./bundle-source-map.js.map
    chunk    {0} ./bundle-source-map.js, ./bundle-source-map.js.map (bundle) 308 bytes {1} [initial] [rendered]
        > bundle [0] (webpack)/node_modules/coffee-loader!./example.coffee 
        [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
    chunk    {1} ./manifest-source-map.js, ./manifest-source-map.js.map (manifest) 0 bytes [entry] [rendered]
```
