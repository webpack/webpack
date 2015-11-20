A common challenge with combining `[chunkhash]` and Code Splitting is that the entry chunk includes the webpack runtime and with it the chunkhash mappings. This means it's always updated and the `[chunkhash]` is pretty useless, because this chunk won't be cached.

A very simple solution to this problem is to create another chunk which contains only the webpack runtime (including chunkhash map). This can be archieved by the CommonsChunkPlugin (or if the CommonsChunkPlugin is already used by passing multiple names to the CommonChunkPlugin). To avoid the additional request for another chunk, this pretty small chunk can be inlined into the HTML page.

The configuration required for this is:

* use `[chunkhash]` in `output.filename` (Note that this example doesn't do this because of the example generator infrastructure, but you should)
* use `[chunkhash]` in `output.chunkFilename`
* `CommonsChunkPlugin`

# example.js

``` javascript
import vendor from "./vendor";
// some module
System.import("./async1");
System.import("./async2");
```

# vendor.js

``` javascript
// some vendor lib (should be in common chunk)
export default 123;
```

# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = {
	entry: {
		main: "./example",
		common: ["./vendor"] // optional
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].chunkhash.js",
		chunkFilename: "[chunkhash].js"
	},
	plugins: [
		new webpack.optimize.CommonsChunkPlugin({
			names: ["common", "manifest"]
		})
		/* without the "common" chunk:
		new webpack.optimize.CommonsChunkPlugin({
			name: "manifest"
		})
		*/
	]
};
```

# index.html

``` html
<html>
<head>
</head>
<body>

<!-- inlined minimized file "manifest.[chunkhash].js" -->
<script>
!function(e){function r(o){if(n[o])return n[o].exports;var t=n[o]={exports:{},id:o,loaded:!1};return e[o].call(t.exports,t,t.exports,r),t.loaded=!0,t.exports}var o=window.webpackJsonp;window.webpackJsonp=function(n,a,i){for(var d,c,f=0,u=[];f<n.length;f++)c=n[f],t[c]&&u.push(t[c][0]),t[c]=0;for(d in a)e[d]=a[d];for(o&&o(n,a);u.length;)u.shift()();return i+1?r(i):void 0};var n={},t={2:0};r.e=function(e){function o(){a.onerror=a.onload=null,clearTimeout(i);var r=t[e];0!==r&&(r&&r[1](new Error("Loading chunk "+e+" failed.")),t[e]=void 0)}if(0===t[e])return Promise.resolve();if(t[e])return t[e][2];var n=document.getElementsByTagName("head")[0],a=document.createElement("script");a.type="text/javascript",a.charset="utf-8",a.async=!0,a.timeout=12e4,a.src=r.p+""+{0:"16274d569fd1e7a2eda7",1:"509642492f90d26144b5",3:"9876f9ef706cd5c5f139",4:"7b8badb0178210fedc90"}[e]+".js";var i=setTimeout(o,12e4);a.onerror=a.onload=o,n.appendChild(a);var d=new Promise(function(r,o){t[e]=[r,o]});return t[e][2]=d},r.m=e,r.c=n,r.oe=function(e){throw e},r.p="js/"}([]);
</script>

<!-- optional when using the CommonChunkPlugin for vendor modules -->
<script src="js/common.[chunkhash].js"></script>

<script src="js/main.[chunkhash].js"></script>

</body>
</html>
```

# js/common.[chunkhash].js

``` javascript
webpackJsonp([3,2],[
/* 0 */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/***/ function(module, exports, __webpack_require__) {

	// some vendor lib (should be in common chunk)
	/* harmony default export */ exports["default"] = 123


/***/ },
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/*!********************!*\
  !*** multi common ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(/*! ./vendor */0);


/***/ }
],[4]);
```

# js/main.[chunkhash].js

``` javascript
webpackJsonp([4,2],{

/***/ 3:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__vendor__ = __webpack_require__(/*! ./vendor */ 0);

	// some module
	__webpack_require__.e/* System.import */(1).then(__webpack_require__.bind(null, /*! ./async1 */ 1));
	__webpack_require__.e/* System.import */(0).then(__webpack_require__.bind(null, /*! ./async2 */ 2));


/***/ }

},[3]);
```

# Info

## Uncompressed

```
Hash: 223f819918db476ed5ff
Version: webpack 2.0.0-beta
Time: 130ms
                  Asset       Size  Chunks             Chunk Names
16274d569fd1e7a2eda7.js  184 bytes    0, 2  [emitted]  
509642492f90d26144b5.js  190 bytes    1, 2  [emitted]  
  manifest.chunkhash.js     4.2 kB       2  [emitted]  manifest
    common.chunkhash.js  517 bytes    3, 2  [emitted]  common
      main.chunkhash.js  513 bytes    4, 2  [emitted]  main
chunk    {0} 16274d569fd1e7a2eda7.js 29 bytes {4} [rendered]
    > [3] ./example.js 4:0-25
    [2] ./async2.js 29 bytes {0} [built]
         ./async2 [3] ./example.js 4:0-25
chunk    {1} 509642492f90d26144b5.js 29 bytes {4} [rendered]
    > [3] ./example.js 3:0-25
    [1] ./async1.js 29 bytes {1} [built]
         ./async1 [3] ./example.js 3:0-25
chunk    {2} manifest.chunkhash.js (manifest) 0 bytes [rendered]
chunk    {3} common.chunkhash.js (common) 97 bytes {2} [rendered]
    > common [4] multi common 
    [0] ./vendor.js 69 bytes {3} [built]
        harmony import ./vendor [3] ./example.js 1:0-30
        single entry ./vendor [4] multi common
    [4] multi common 28 bytes {3} [built]
chunk    {4} main.chunkhash.js (main) 104 bytes {3} [rendered]
    > main [3] ./example.js 
    [3] ./example.js 104 bytes {4} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 223f819918db476ed5ff
Version: webpack 2.0.0-beta
Time: 317ms
                  Asset       Size  Chunks             Chunk Names
16274d569fd1e7a2eda7.js   40 bytes    0, 2  [emitted]  
509642492f90d26144b5.js   39 bytes    1, 2  [emitted]  
  manifest.chunkhash.js    1.05 kB       2  [emitted]  manifest
    common.chunkhash.js   95 bytes    3, 2  [emitted]  common
      main.chunkhash.js  106 bytes    4, 2  [emitted]  main
chunk    {0} 16274d569fd1e7a2eda7.js 29 bytes {4} [rendered]
    > [3] ./example.js 4:0-25
    [2] ./async2.js 29 bytes {0} [built]
         ./async2 [3] ./example.js 4:0-25
chunk    {1} 509642492f90d26144b5.js 29 bytes {4} [rendered]
    > [3] ./example.js 3:0-25
    [1] ./async1.js 29 bytes {1} [built]
         ./async1 [3] ./example.js 3:0-25
chunk    {2} manifest.chunkhash.js (manifest) 0 bytes [rendered]
chunk    {3} common.chunkhash.js (common) 97 bytes {2} [rendered]
    > common [4] multi common 
    [0] ./vendor.js 69 bytes {3} [built]
        harmony import ./vendor [3] ./example.js 1:0-30
        single entry ./vendor [4] multi common
    [4] multi common 28 bytes {3} [built]
chunk    {4} main.chunkhash.js (main) 104 bytes {3} [rendered]
    > main [3] ./example.js 
    [3] ./example.js 104 bytes {4} [built]
```