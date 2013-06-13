
# example.js

``` javascript
// index.js and x.js can be deduplicated
require(["../dedupe/a", "bundle?lazy!../dedupe/b"]);

```

# js/1.output.js

``` javascript
webpackJsonp([1],
{

/***/ 1:
/*!***************************************************************************************************************************!*\
  !*** (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js ***!
  \***************************************************************************************************************************/
/***/ function(module, exports, require) {

	module.exports = function(cb) {
		require.e/*nsure*/(2, function(require) {
			cb(require(/*! !../dedupe/b/index.js */ 6));
		});
	}

/***/ },

/***/ 2:
[9, 4, 5],

/***/ 3:
/*!**********************!*\
  !*** ../dedupe/z.js ***!
  \**********************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "z"};

/***/ },

/***/ 4:
/*!************************!*\
  !*** ../dedupe/a/x.js ***!
  \************************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "x"};

/***/ },

/***/ 5:
/*!************************!*\
  !*** ../dedupe/a/y.js ***!
  \************************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "y", "but in": "a"};

/***/ },

/***/ 9:
/*!********!*\
  !***  ***!
  \********/
/***/ function(module, exports, require, __webpack_module_template_argument_0__, __webpack_module_template_argument_1__) {

	module.exports = {
		x: require(__webpack_module_template_argument_0__),
		y: require(__webpack_module_template_argument_1__),
		z: require(/*! ../z */ 3)
	}

/***/ }

}
)
```

# js/2.output.js

``` javascript
webpackJsonp([2],
{

/***/ 6:
[9, 7, 8],

/***/ 7:
4,

/***/ 8:
/*!************************!*\
  !*** ../dedupe/b/y.js ***!
  \************************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "y", "but in": "b"};

/***/ }

}
)
```

# Info

## Uncompressed

```
Hash: 81148181bfb1b39e2c48
Version: webpack 0.10.0-beta20
Time: 78ms
      Asset  Size  Chunks             Chunk Names
  output.js  4424       0  [emitted]  main       
1.output.js  1548       1  [emitted]             
2.output.js   261       2  [emitted]             
chunk    {0} output.js (main) 94 [rendered]
    [0] ./example.js 94 {0} [built]
chunk    {1} 1.output.js 508 {0} [rendered]
    [1] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 231 {1} [built]
        amd require bundle?lazy!../dedupe/b [0] ./example.js 2:0-51
    [2] ../dedupe/a/index.js 80 {1} [built]
        amd require ../dedupe/a [0] ./example.js 2:0-51
    [3] ../dedupe/z.js 34 {1} [built]
        cjs require ../z [2] ../dedupe/a/index.js 4:4-19
        cjs require ../z [6] ../dedupe/b/index.js 4:4-19
    [4] ../dedupe/a/x.js 34 {1} [built]
        cjs require ./x [2] ../dedupe/a/index.js 2:4-18
    [5] ../dedupe/a/y.js 49 {1} [built]
        cjs require ./y [2] ../dedupe/a/index.js 3:4-18
    [9]  80 {1} [not cacheable] [built]
        template 3 [2] ../dedupe/a/index.js
        template 3 [6] ../dedupe/b/index.js
chunk    {2} 2.output.js 163 {1} [rendered]
    [6] ../dedupe/b/index.js 80 {2} [built]
        cjs require !!(webpack)\examples\dedupe\b\index.js [1] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-150
    [7] ../dedupe/b/x.js 34 {2} [built]
        cjs require ./x [6] ../dedupe/b/index.js 2:4-18
    [8] ../dedupe/b/y.js 49 {2} [built]
        cjs require ./y [6] ../dedupe/b/index.js 3:4-18
```

## Minimized (uglify-js, no zip)

```
Hash: 81148181bfb1b39e2c48
Version: webpack 0.10.0-beta20
Time: 172ms
      Asset  Size  Chunks             Chunk Names
  output.js  1096       0  [emitted]  main       
1.output.js   292       1  [emitted]             
2.output.js    88       2  [emitted]             
chunk    {0} output.js (main) 94 [rendered]
    [0] ./example.js 94 {0} [built]
chunk    {1} 1.output.js 508 {0} [rendered]
    [1] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 231 {1} [built]
        amd require bundle?lazy!../dedupe/b [0] ./example.js 2:0-51
    [2] ../dedupe/a/index.js 80 {1} [built]
        amd require ../dedupe/a [0] ./example.js 2:0-51
    [3] ../dedupe/z.js 34 {1} [built]
        cjs require ../z [2] ../dedupe/a/index.js 4:4-19
        cjs require ../z [6] ../dedupe/b/index.js 4:4-19
    [4] ../dedupe/a/x.js 34 {1} [built]
        cjs require ./x [2] ../dedupe/a/index.js 2:4-18
    [5] ../dedupe/a/y.js 49 {1} [built]
        cjs require ./y [2] ../dedupe/a/index.js 3:4-18
    [9]  80 {1} [not cacheable] [built]
        template 3 [2] ../dedupe/a/index.js
        template 3 [6] ../dedupe/b/index.js
chunk    {2} 2.output.js 163 {1} [rendered]
    [6] ../dedupe/b/index.js 80 {2} [built]
        cjs require !!(webpack)\examples\dedupe\b\index.js [1] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-150
    [7] ../dedupe/b/x.js 34 {2} [built]
        cjs require ./x [6] ../dedupe/b/index.js 2:4-18
    [8] ../dedupe/b/y.js 49 {2} [built]
        cjs require ./y [6] ../dedupe/b/index.js 3:4-18
```