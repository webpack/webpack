
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
	// mode: "development || "production",
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
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],{

/***/ 0:
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(/*! ./style.css */ 1);
__webpack_require__(/*! ./styleA.css */ 7);


/***/ }),

/***/ 7:
/*!********************!*\
  !*** ./styleA.css ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ })

},[[0,3,0]]]);
```

# js/commons.css

``` css
body {
	background: url(js/ce21cbdd9b894e6af794813eb3fdaf60.png);
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
body {
	background: url(js/ce21cbdd9b894e6af794813eb3fdaf60.png);
}
.c {
	background: url(js/c2a2f62d69330b7d787782f5010f9d13.png);
}
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack next
                               Asset       Size  Chunks             Chunk Names
                                C.js   2.97 KiB       2  [emitted]  C
d090b6fba0f6d326d282a19146ff54a7.png  120 bytes          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png  120 bytes          [emitted]  
                                A.js  547 bytes       0  [emitted]  A
                                B.js  551 bytes       1  [emitted]  B
16155c689e517682064c99893cb832cc.png  120 bytes          [emitted]  
                          commons.js   7.25 KiB       3  [emitted]  commons
                               A.css   69 bytes       0  [emitted]  A
                               B.css   69 bytes       1  [emitted]  B
                               C.css  140 bytes       2  [emitted]  C
                         commons.css   71 bytes       3  [emitted]  commons
Entrypoint A = commons.js commons.css A.js A.css
Entrypoint B = commons.js commons.css B.js B.css
Entrypoint C = C.js C.css
chunk    {0} A.js, A.css (A) 92 bytes {3} [initial] [rendered]
    > A [0] ./a.js 
    [0] ./a.js 51 bytes {0} [built]
        single entry ./a  A
    [7] ./styleA.css 41 bytes [built]
chunk    {1} B.js, B.css (B) 92 bytes {3} [initial] [rendered]
    > B [10] ./b.js 
   [10] ./b.js 51 bytes {1} [built]
        single entry ./b  B
   [11] ./styleB.css 41 bytes [built]
chunk    {2} C.js, C.css (C) 67 bytes [entry] [rendered]
    > C [14] ./c.js 
   [14] ./c.js 26 bytes {2} [built]
        single entry ./c  C
   [15] ./styleC.css 41 bytes [built]
chunk    {3} commons.js, commons.css (commons) 41 bytes [entry] [rendered]
    [1] ./style.css 41 bytes [built]
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
        > [0] (webpack)/node_modules/css-loader!./styleC.css 
        [0] (webpack)/node_modules/css-loader!./styleC.css 313 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\styleC.css 
        [2] (webpack)/node_modules/css-loader!./style.css 235 bytes {0} [built]
            cjs require -!../../node_modules/css-loader/index.js!./style.css [0] (webpack)/node_modules/css-loader!./styleC.css 3:10-73
        [3] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/node_modules/css-loader!./style.css 6:58-80
        [4] ./imageC.png 82 bytes {0} [built]
            cjs require ./imageC.png [0] (webpack)/node_modules/css-loader!./styleC.css 6:56-79
         + 1 hidden module
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack next
                               Asset       Size  Chunks             Chunk Names
                          commons.js   1.72 KiB       2  [emitted]  commons
d090b6fba0f6d326d282a19146ff54a7.png  120 bytes          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png  120 bytes          [emitted]  
                                B.js  118 bytes       0  [emitted]  B
                                A.js  120 bytes       1  [emitted]  A
16155c689e517682064c99893cb832cc.png  120 bytes          [emitted]  
                                C.js  574 bytes       3  [emitted]  C
                               A.css   69 bytes       1  [emitted]  A
                               B.css   69 bytes       0  [emitted]  B
                               C.css  140 bytes       3  [emitted]  C
                         commons.css   71 bytes       2  [emitted]  commons
Entrypoint A = commons.js commons.css A.js A.css
Entrypoint B = commons.js commons.css B.js B.css
Entrypoint C = C.js C.css
chunk    {0} B.js, B.css (B) 92 bytes {2} [initial] [rendered]
    > B [1] ./b.js 
    [1] ./b.js 51 bytes {0} [built]
        single entry ./b  B
    [8] ./styleB.css 41 bytes [built]
chunk    {1} A.js, A.css (A) 92 bytes {2} [initial] [rendered]
    > A [2] ./a.js 
    [2] ./a.js 51 bytes {1} [built]
        single entry ./a  A
   [11] ./styleA.css 41 bytes [built]
chunk    {2} commons.js, commons.css (commons) 41 bytes [entry] [rendered]
   [17] ./style.css 41 bytes [built]
chunk    {3} C.js, C.css (C) 67 bytes [entry] [rendered]
    > C [0] ./c.js 
    [0] ./c.js 26 bytes {3} [built]
        single entry ./c  C
    [5] ./styleC.css 41 bytes [built]
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleA.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.52 KiB [entry] [rendered]
        > [2] (webpack)/node_modules/css-loader!./styleA.css 
        [0] ./imageA.png 82 bytes {0} [built]
            cjs require ./imageA.png [2] (webpack)/node_modules/css-loader!./styleA.css 6:56-79
        [2] (webpack)/node_modules/css-loader!./styleA.css 234 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\styleA.css 
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleB.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.52 KiB [entry] [rendered]
        > [2] (webpack)/node_modules/css-loader!./styleB.css 
        [0] ./imageB.png 82 bytes {0} [built]
            cjs require ./imageB.png [2] (webpack)/node_modules/css-loader!./styleB.css 6:56-79
        [2] (webpack)/node_modules/css-loader!./styleB.css 234 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\styleB.css 
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!style.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.52 KiB [entry] [rendered]
        > [2] (webpack)/node_modules/css-loader!./style.css 
        [0] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/node_modules/css-loader!./style.css 6:58-80
        [2] (webpack)/node_modules/css-loader!./style.css 235 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\style.css 
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleC.css:
     2 assets
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.9 KiB [entry] [rendered]
        > [4] (webpack)/node_modules/css-loader!./styleC.css 
        [1] ./imageC.png 82 bytes {0} [built]
            cjs require ./imageC.png [4] (webpack)/node_modules/css-loader!./styleC.css 6:56-79
        [2] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [3] (webpack)/node_modules/css-loader!./style.css 6:58-80
        [3] (webpack)/node_modules/css-loader!./style.css 235 bytes {0} [built]
            cjs require -!../../node_modules/css-loader/index.js!./style.css [4] (webpack)/node_modules/css-loader!./styleC.css 3:10-73
        [4] (webpack)/node_modules/css-loader!./styleC.css 313 bytes {0} [built]
            single entry !!(webpack)\node_modules\css-loader\index.js!.\styleC.css 
         + 1 hidden module
```
