
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
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
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
		loaders: [
			{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract("style-loader", "css-loader")
			},
			{ test: /\.png$/, loader: "file-loader" }
		]
	},
	plugins: [
		new CommonsChunkPlugin("commons", "commons.js", ["A", "B"]),
		new ExtractTextPlugin("[name].css"),
	]
};
```

# js/A.js

``` javascript
webpackJsonp([3],[
/* 0 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! ./style.css */ 1);
	__webpack_require__(/*! ./styleA.css */ 2);


/***/ },
/* 1 */,
/* 2 */
/*!********************!*\
  !*** ./styleA.css ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	// removed by extract-text-webpack-plugin

/***/ }
]);
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
.b{background:url(js/16155c689e517682064c99893cb832cc.png)}
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
Hash: 0297acc957f5304cd999
Version: webpack 1.5.3
Time: 284ms
                               Asset  Size  Chunks             Chunk Names
                                B.js   458       2  [emitted]  B
16155c689e517682064c99893cb832cc.png   120          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png   120          [emitted]  
                                C.js  1824       0  [emitted]  C
                          commons.js  3865       1  [emitted]  commons
d090b6fba0f6d326d282a19146ff54a7.png   120          [emitted]  
                                A.js   449       3  [emitted]  A
                               B.css    69       2  [emitted]  B
                               A.css    69       3  [emitted]  A
                               C.css   142       0  [emitted]  C
                         commons.css    71       1  [emitted]  commons
chunk    {0} C.js, C.css (C) 67 [rendered]
    > C [0] ./c.js 
    [0] ./c.js 26 {0} [built]
    [4] ./styleC.css 41 {0} [built]
        cjs require ./styleC.css [0] ./c.js 1:0-23
chunk    {1} commons.js, commons.css (commons) 41 [rendered]
    [1] ./style.css 41 {1} [built]
        cjs require ./style.css [0] ./b.js 1:0-22
        cjs require ./style.css [0] ./a.js 1:0-22
chunk    {2} B.js, B.css (B) 92 {1} [rendered]
    > B [0] ./b.js 
    [0] ./b.js 51 {2} [built]
    [3] ./styleB.css 41 {2} [built]
        cjs require ./styleB.css [0] ./b.js 2:0-23
chunk    {3} A.js, A.css (A) 92 {1} [rendered]
    > A [0] ./a.js 
    [0] ./a.js 51 {3} [built]
    [2] ./styleA.css 41 {3} [built]
        cjs require ./styleA.css [0] ./a.js 2:0-23
Child extract-text-webpack-plugin:
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)/~\css-loader\index.js!.\styleB.css 636 [rendered]
        > [0] (webpack)/~/css-loader!./styleB.css 
        [0] (webpack)/~/css-loader!./styleB.css 203 {0} [built]
        [1] (webpack)/~/css-loader/cssToString.js 352 {0} [built]
            cjs require (webpack)/~\css-loader\cssToString.js [0] (webpack)/~/css-loader!./styleB.css 1:27-101
        [2] ./imageB.png 81 {0} [built]
            cjs require ./imageB.png [0] (webpack)/~/css-loader!./styleB.css 2:54-77
Child extract-text-webpack-plugin:
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)/~\css-loader\index.js!.\styleA.css 636 [rendered]
        > [0] (webpack)/~/css-loader!./styleA.css 
        [0] (webpack)/~/css-loader!./styleA.css 203 {0} [built]
        [1] (webpack)/~/css-loader/cssToString.js 352 {0} [built]
            cjs require (webpack)/~\css-loader\cssToString.js [0] (webpack)/~/css-loader!./styleA.css 1:27-101
        [2] ./imageA.png 81 {0} [built]
            cjs require ./imageA.png [0] (webpack)/~/css-loader!./styleA.css 2:54-77
Child extract-text-webpack-plugin:
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)/~\css-loader\index.js!.\styleC.css 1386 [rendered]
        > [0] (webpack)/~/css-loader!./styleC.css 
        [0] (webpack)/~/css-loader!./styleC.css 380 {0} [built]
        [1] (webpack)/~/css-loader/cssToString.js 352 {0} [built]
            cjs require (webpack)/~\css-loader\cssToString.js [0] (webpack)/~/css-loader!./styleC.css 1:27-101
            cjs require (webpack)/~\css-loader\cssToString.js [2] (webpack)/~/css-loader!./style.css 1:27-101
        [2] (webpack)/~/css-loader!./style.css 204 {0} [built]
            cjs require -!(webpack)/~\css-loader\index.js!./style.css [0] (webpack)/~/css-loader!./styleC.css 2:84-166
        [3] (webpack)/~/css-loader/mergeImport.js 288 {0} [built]
            cjs require (webpack)/~\css-loader\mergeImport.js [0] (webpack)/~/css-loader!./styleC.css 2:0-74
        [4] ./image.png 81 {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 2:56-78
        [5] ./imageC.png 81 {0} [built]
            cjs require ./imageC.png [0] (webpack)/~/css-loader!./styleC.css 3:58-81
Child extract-text-webpack-plugin:
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)/~\css-loader\index.js!.\style.css 637 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 204 {0} [built]
        [1] (webpack)/~/css-loader/cssToString.js 352 {0} [built]
            cjs require (webpack)/~\css-loader\cssToString.js [0] (webpack)/~/css-loader!./style.css 1:27-101
        [2] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:56-78
```

## Minimized (uglify-js, no zip)

```
Hash: c2e7cad10a4804a5a5d5
Version: webpack 1.5.3
Time: 462ms
                               Asset  Size  Chunks             Chunk Names
                                B.js    62       2  [emitted]  B
16155c689e517682064c99893cb832cc.png   120          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png   120          [emitted]  
d090b6fba0f6d326d282a19146ff54a7.png   120          [emitted]  
                                C.js   243       0  [emitted]  C
                          commons.js   752       1  [emitted]  commons
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
                                A.js    61       3  [emitted]  A
                               B.css    59       2  [emitted]  B
                               C.css   120       0  [emitted]  C
                               A.css    59       3  [emitted]  A
                         commons.css    61       1  [emitted]  commons
chunk    {0} C.js, C.css (C) 67 [rendered]
    > C [0] ./c.js 
    [0] ./c.js 26 {0} [built]
    [4] ./styleC.css 41 {0} [built]
        cjs require ./styleC.css [0] ./c.js 1:0-23
chunk    {1} commons.js, commons.css (commons) 41 [rendered]
    [1] ./style.css 41 {1} [built]
        cjs require ./style.css [0] ./a.js 1:0-22
        cjs require ./style.css [0] ./b.js 1:0-22
chunk    {2} B.js, B.css (B) 92 {1} [rendered]
    > B [0] ./b.js 
    [0] ./b.js 51 {2} [built]
    [3] ./styleB.css 41 {2} [built]
        cjs require ./styleB.css [0] ./b.js 2:0-23
chunk    {3} A.js, A.css (A) 92 {1} [rendered]
    > A [0] ./a.js 
    [0] ./a.js 51 {3} [built]
    [2] ./styleA.css 41 {3} [built]
        cjs require ./styleA.css [0] ./a.js 2:0-23
Child extract-text-webpack-plugin:
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)/~\css-loader\index.js!.\styleB.css 619 [rendered]
        > [0] (webpack)/~/css-loader!./styleB.css 
        [0] (webpack)/~/css-loader!./styleB.css 186 {0} [built]
        [1] (webpack)/~/css-loader/cssToString.js 352 {0} [built]
            cjs require (webpack)/~\css-loader\cssToString.js [0] (webpack)/~/css-loader!./styleB.css 1:27-101
        [2] ./imageB.png 81 {0} [built]
            cjs require ./imageB.png [0] (webpack)/~/css-loader!./styleB.css 2:46-69
Child extract-text-webpack-plugin:
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)/~\css-loader\index.js!.\styleC.css 1348 [rendered]
        > [0] (webpack)/~/css-loader!./styleC.css 
        [0] (webpack)/~/css-loader!./styleC.css 359 {0} [built]
        [1] (webpack)/~/css-loader/cssToString.js 352 {0} [built]
            cjs require (webpack)/~\css-loader\cssToString.js [0] (webpack)/~/css-loader!./styleC.css 1:27-101
            cjs require (webpack)/~\css-loader\cssToString.js [2] (webpack)/~/css-loader!./style.css 1:27-101
        [2] (webpack)/~/css-loader!./style.css 187 {0} [built]
            cjs require -!(webpack)/~\css-loader\index.js!./style.css [0] (webpack)/~/css-loader!./styleC.css 2:84-166
        [3] (webpack)/~/css-loader/mergeImport.js 288 {0} [built]
            cjs require (webpack)/~\css-loader\mergeImport.js [0] (webpack)/~/css-loader!./styleC.css 2:0-74
        [4] ./image.png 81 {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 2:48-70
        [5] ./imageC.png 81 {0} [built]
            cjs require ./imageC.png [0] (webpack)/~/css-loader!./styleC.css 3:46-69
Child extract-text-webpack-plugin:
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)/~\css-loader\index.js!.\styleA.css 619 [rendered]
        > [0] (webpack)/~/css-loader!./styleA.css 
        [0] (webpack)/~/css-loader!./styleA.css 186 {0} [built]
        [1] (webpack)/~/css-loader/cssToString.js 352 {0} [built]
            cjs require (webpack)/~\css-loader\cssToString.js [0] (webpack)/~/css-loader!./styleA.css 1:27-101
        [2] ./imageA.png 81 {0} [built]
            cjs require ./imageA.png [0] (webpack)/~/css-loader!./styleA.css 2:46-69
Child extract-text-webpack-plugin:
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)/~\css-loader\index.js!.\style.css 620 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 187 {0} [built]
        [1] (webpack)/~/css-loader/cssToString.js 352 {0} [built]
            cjs require (webpack)/~\css-loader\cssToString.js [0] (webpack)/~/css-loader!./style.css 1:27-101
        [2] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:48-70
```
