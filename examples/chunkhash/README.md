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
!function(e){function r(o){if(n[o])return n[o].exports;var t=n[o]={exports:{},id:o,loaded:!1};return e[o].call(t.exports,t,t.exports,r),t.loaded=!0,t.exports}var o=window.webpackJsonp;window.webpackJsonp=function(n,a,c){for(var i,d,f=0,u=[];f<n.length;f++)d=n[f],t[d]&&u.push(t[d][0]),t[d]=0;for(i in a)e[i]=a[i];for(o&&o(n,a);u.length;)u.shift()();return c+1?r(c):void 0};var n={},t={2:0};r.e=function(e){function o(){a.onerror=a.onload=null,clearTimeout(c);var r=t[e];0!==r&&(r&&r[1](new Error("Loading chunk "+e+" failed.")),t[e]=void 0)}if(0===t[e])return Promise.resolve();if(t[e])return t[e][2];var n=document.getElementsByTagName("head")[0],a=document.createElement("script");a.type="text/javascript",a.charset="utf-8",a.async=!0,a.timeout=12e4,a.src=r.p+""+{0:"27ffa809c94fb1e509c5",1:"8925d45ed07a265d4246",3:"f2764945b8b62e30c662",4:"bcb99dbc93c7f755b2df"}[e]+".js";var c=setTimeout(o,12e4);a.onerror=a.onload=o,n.appendChild(a);var i=new Promise(function(r,o){t[e]=[r,o]});return t[e][2]=i},r.m=e,r.c=n,r.p="js/",r.oe=function(e){throw e}}([]);
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
Hash: e8b4a7834dca40744042
Version: webpack 2.0.6-beta
Time: 118ms
                  Asset       Size  Chunks             Chunk Names
27ffa809c94fb1e509c5.js  184 bytes    0, 2  [emitted]  
8925d45ed07a265d4246.js  190 bytes    1, 2  [emitted]  
  manifest.chunkhash.js     4.2 kB       2  [emitted]  manifest
    common.chunkhash.js  517 bytes    3, 2  [emitted]  common
      main.chunkhash.js  513 bytes    4, 2  [emitted]  main
chunk    {0} 27ffa809c94fb1e509c5.js 29 bytes {4} [rendered]
    > [3] ./example.js 4:0-25
    [2] ./async2.js 29 bytes {0} [built]
        System.import ./async2 [3] ./example.js 4:0-25
chunk    {1} 8925d45ed07a265d4246.js 29 bytes {4} [rendered]
    > [3] ./example.js 3:0-25
    [1] ./async1.js 29 bytes {1} [built]
        System.import ./async1 [3] ./example.js 3:0-25
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
Hash: e8b4a7834dca40744042
Version: webpack 2.0.6-beta
Time: 176ms
                  Asset       Size  Chunks             Chunk Names
27ffa809c94fb1e509c5.js   40 bytes    0, 2  [emitted]  
8925d45ed07a265d4246.js   39 bytes    1, 2  [emitted]  
  manifest.chunkhash.js    1.05 kB       2  [emitted]  manifest
    common.chunkhash.js   95 bytes    3, 2  [emitted]  common
      main.chunkhash.js  106 bytes    4, 2  [emitted]  main
chunk    {0} 27ffa809c94fb1e509c5.js 29 bytes {4} [rendered]
    > [3] ./example.js 4:0-25
    [2] ./async2.js 29 bytes {0} [built]
        System.import ./async2 [3] ./example.js 4:0-25
chunk    {1} 8925d45ed07a265d4246.js 29 bytes {4} [rendered]
    > [3] ./example.js 3:0-25
    [1] ./async1.js 29 bytes {1} [built]
        System.import ./async1 [3] ./example.js 3:0-25
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