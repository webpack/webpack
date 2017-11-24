
# a.js

``` javascript
require("./style.css");
require("./styleA.css");
```

# b.js

``` javascript
require("./style.css");
require("./styleB.css");
```

# c.js

``` javascript
require("./styleC.css");
```

# style.css

``` css
body {
	background: url(image.png);
}
```

# styleA.css

``` css
.a {
	background: url(imageA.png);
}
```

# styleB.css

``` css
.b {
	background: url(imageB.png);
}
```

# styleC.css

``` css
@import "style.css";
.c {
	background: url(imageC.png);
}
```

# webpack.config.js

``` javascript
const path = require("path");
const LoaderOptionsPlugin = require("../../lib/LoaderOptionsPlugin");
const CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
	mode: "production",
	entry: {
		A: "./a",
		B: "./b",
		C: "./c",
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
					fallback: "style-loader",
					use: "css-loader"
				})
			},
			{ test: /\.png$/, loader: "file-loader" }
		]
	},
	plugins: [
		new CommonsChunkPlugin({
			name: "commons",
			filename: "commons.js",
			chunks: ["A", "B"]
		}),
		new ExtractTextPlugin({
			filename: "[name].css"
		}),
		// Temporary workaround for the file-loader
		new LoaderOptionsPlugin({
			options: {}
		})
	]
};
```

# js/A.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */,
/* 1 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(/*! ./style.css */ 0);
__webpack_require__(/*! ./styleA.css */ 2);


/***/ }),
/* 2 */
/*!********************!*\
  !*** ./styleA.css ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ })
],[[1,3,1]]]);
```

# js/commons.css

``` css
body {
	background: url(js/ce21cbdd9b894e6af794813eb3fdaf60.png);
}
.a {
	background: url(js/d090b6fba0f6d326d282a19146ff54a7.png);
}
.b {
	background: url(js/16155c689e517682064c99893cb832cc.png);
}
```

# js/A.css

``` css
.a {
	background: url(js/d090b6fba0f6d326d282a19146ff54a7.png);
}
```

# js/B.css

``` css
.b {
	background: url(js/16155c689e517682064c99893cb832cc.png);
}
```

# js/B.css (Minimized)

``` css
.b {
	background: url(js/16155c689e517682064c99893cb832cc.png);
}
```

# js/C.css

``` css
body {
	background: url(js/ce21cbdd9b894e6af794813eb3fdaf60.png);
}
.c {
	background: url(js/c2a2f62d69330b7d787782f5010f9d13.png);
}
```

# js/C.css (Minimized)

``` css
body{background:url(js/ce21cbdd9b894e6af794813eb3fdaf60.png)}.c{background:url(js/c2a2f62d69330b7d787782f5010f9d13.png)}
```

# Info

## Uncompressed

```
Hash: 711713d36400c8b91a48
Version: webpack next
                               Asset       Size  Chunks             Chunk Names
d090b6fba0f6d326d282a19146ff54a7.png  120 bytes          [emitted]  
16155c689e517682064c99893cb832cc.png  120 bytes          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png  120 bytes          [emitted]  
                                B.js  759 bytes       0  [emitted]  B
                                A.js  741 bytes       1  [emitted]  A
                                C.js   3.15 KiB       2  [emitted]  C
                          commons.js   7.33 KiB       3  [emitted]  commons
                               C.css  140 bytes       2  [emitted]  C
                         commons.css  209 bytes       3  [emitted]  commons
Entrypoint A = commons.js commons.css A.js
Entrypoint B = commons.js commons.css B.js
Entrypoint C = C.js C.css
chunk    {0} B.js (B) 92 bytes {3} [initial] [rendered]
    > B [3] ./b.js 
    [3] ./b.js 51 bytes {0} [built]
        single entry ./b  B
    [4] ./styleB.css 41 bytes {0} [built]
        cjs require ./styleB.css [3] ./b.js 2:0-23
chunk    {1} A.js (A) 92 bytes {3} [initial] [rendered]
    > A [1] ./a.js 
    [1] ./a.js 51 bytes {1} [built]
        single entry ./a  A
    [2] ./styleA.css 41 bytes {1} [built]
        cjs require ./styleA.css [1] ./a.js 2:0-23
chunk    {2} C.js, C.css (C) 67 bytes [entry] [rendered]
    > C [5] ./c.js 
    [5] ./c.js 26 bytes {2} [built]
        single entry ./c  C
    [6] ./styleC.css 41 bytes {2} [built]
        cjs require ./styleC.css [5] ./c.js 1:0-23
chunk    {3} commons.js, commons.css (commons) 41 bytes [entry] [rendered]
    [0] ./style.css 41 bytes {3} [built]
        cjs require ./style.css [1] ./a.js 1:0-22
        cjs require ./style.css [3] ./b.js 1:0-22
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleA.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.52 KiB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./styleA.css 
        [0] (webpack)/node_modules/css-loader!./styleA.css 234 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\styleA.css 
        [2] ./imageA.png 82 bytes {0} [built]
            cjs require ./imageA.png [0] (webpack)/node_modules/css-loader!./styleA.css 6:56-79
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleB.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.52 KiB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./styleB.css 
        [0] (webpack)/node_modules/css-loader!./styleB.css 234 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\styleB.css 
        [2] ./imageB.png 82 bytes {0} [built]
            cjs require ./imageB.png [0] (webpack)/node_modules/css-loader!./styleB.css 6:56-79
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!style.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.52 KiB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./style.css 
        [0] (webpack)/node_modules/css-loader!./style.css 235 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\style.css 
        [2] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [0] (webpack)/node_modules/css-loader!./style.css 6:58-80
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleC.css:
     2 assets
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.9 KiB [entry] [rendered]
        > [1] (webpack)/node_modules/css-loader!./styleC.css 
        [1] (webpack)/node_modules/css-loader!./styleC.css 313 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\styleC.css 
        [2] (webpack)/node_modules/css-loader!./style.css 235 bytes {0} [built]
            cjs require -!../../node_modules/css-loader/index.js!./style.css [1] (webpack)/node_modules/css-loader!./styleC.css 3:10-73
        [3] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/node_modules/css-loader!./style.css 6:58-80
        [4] ./imageC.png 82 bytes {0} [built]
            cjs require ./imageC.png [1] (webpack)/node_modules/css-loader!./styleC.css 6:56-79
         + 1 hidden module
```

## Minimized (uglify-js, no zip)

```
Hash: 902543b1251deb968d59
Version: webpack next
                               Asset       Size  Chunks             Chunk Names
d090b6fba0f6d326d282a19146ff54a7.png  120 bytes          [emitted]  
16155c689e517682064c99893cb832cc.png  120 bytes          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png  120 bytes          [emitted]  
                                B.js  116 bytes       0  [emitted]  B
                                A.js  114 bytes       1  [emitted]  A
                                C.js  574 bytes       2  [emitted]  C
                          commons.js   1.72 KiB       3  [emitted]  commons
                               C.css  120 bytes       2  [emitted]  C
                         commons.css  179 bytes       3  [emitted]  commons
Entrypoint A = commons.js commons.css A.js
Entrypoint B = commons.js commons.css B.js
Entrypoint C = C.js C.css
chunk    {0} B.js (B) 92 bytes {3} [initial] [rendered]
    > B [3] ./b.js 
    [3] ./b.js 51 bytes {0} [built]
        single entry ./b  B
    [4] ./styleB.css 41 bytes {0} [built]
        cjs require ./styleB.css [3] ./b.js 2:0-23
chunk    {1} A.js (A) 92 bytes {3} [initial] [rendered]
    > A [1] ./a.js 
    [1] ./a.js 51 bytes {1} [built]
        single entry ./a  A
    [2] ./styleA.css 41 bytes {1} [built]
        cjs require ./styleA.css [1] ./a.js 2:0-23
chunk    {2} C.js, C.css (C) 67 bytes [entry] [rendered]
    > C [5] ./c.js 
    [5] ./c.js 26 bytes {2} [built]
        single entry ./c  C
    [6] ./styleC.css 41 bytes {2} [built]
        cjs require ./styleC.css [5] ./c.js 1:0-23
chunk    {3} commons.js, commons.css (commons) 41 bytes [entry] [rendered]
    [0] ./style.css 41 bytes {3} [built]
        cjs require ./style.css [1] ./a.js 1:0-22
        cjs require ./style.css [3] ./b.js 1:0-22
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleA.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.5 KiB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./styleA.css 
        [0] (webpack)/node_modules/css-loader!./styleA.css 217 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\styleA.css 
        [2] ./imageA.png 82 bytes {0} [built]
            cjs require ./imageA.png [0] (webpack)/node_modules/css-loader!./styleA.css 6:48-71
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleB.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.5 KiB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./styleB.css 
        [0] (webpack)/node_modules/css-loader!./styleB.css 217 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\styleB.css 
        [2] ./imageB.png 82 bytes {0} [built]
            cjs require ./imageB.png [0] (webpack)/node_modules/css-loader!./styleB.css 6:48-71
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!style.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.5 KiB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./style.css 
        [0] (webpack)/node_modules/css-loader!./style.css 218 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\style.css 
        [2] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [0] (webpack)/node_modules/css-loader!./style.css 6:50-72
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleC.css:
     2 assets
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.87 KiB [entry] [rendered]
        > [1] (webpack)/node_modules/css-loader!./styleC.css 
        [1] (webpack)/node_modules/css-loader!./styleC.css 296 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\styleC.css 
        [2] (webpack)/node_modules/css-loader!./style.css 218 bytes {0} [built]
            cjs require -!../../node_modules/css-loader/index.js!./style.css [1] (webpack)/node_modules/css-loader!./styleC.css 3:10-73
        [3] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/node_modules/css-loader!./style.css 6:50-72
        [4] ./imageC.png 82 bytes {0} [built]
            cjs require ./imageC.png [1] (webpack)/node_modules/css-loader!./styleC.css 6:48-71
         + 1 hidden module
```
