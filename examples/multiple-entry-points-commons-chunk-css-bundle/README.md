
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
require("./style.css");
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
Hash: dc03b169830a24add842
Version: webpack 1.3.2-beta8
Time: 164ms
                               Asset  Size  Chunks             Chunk Names
                               B.css    69          [emitted]  
d090b6fba0f6d326d282a19146ff54a7.png   120          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png   120          [emitted]  
16155c689e517682064c99893cb832cc.png   120          [emitted]  
                               A.css    69          [emitted]  
                               C.css   140          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
                         commons.css    71          [emitted]  
                                C.js  2051    0, 1  [emitted]  C
                          commons.js  3828       1  [emitted]  commons
                                B.js   458       2  [emitted]  B
                                A.js   449       3  [emitted]  A
chunk    {0} C.js (C) 133 [rendered]
    > C [0] ./c.js 
    [0] ./c.js 51 {0} [built]
    [1] ./style.css 41 {0} {1} [built]
        cjs require ./style.css [0] ./a.js 1:0-22
        cjs require ./style.css [0] ./b.js 1:0-22
        cjs require ./style.css [0] ./c.js 1:0-22
    [4] ./styleC.css 41 {0} [built]
        cjs require ./styleC.css [0] ./c.js 2:0-23
chunk    {1} commons.js (commons) 41 [rendered]
    [1] ./style.css 41 {0} {1} [built]
        cjs require ./style.css [0] ./a.js 1:0-22
        cjs require ./style.css [0] ./b.js 1:0-22
        cjs require ./style.css [0] ./c.js 1:0-22
chunk    {2} B.js (B) 92 {1} [rendered]
    > B [0] ./b.js 
    [0] ./b.js 51 {2} [built]
    [3] ./styleB.css 41 {2} [built]
        cjs require ./styleB.css [0] ./b.js 2:0-23
chunk    {3} A.js (A) 92 {1} [rendered]
    > A [0] ./a.js 
    [0] ./a.js 51 {3} [built]
    [2] ./styleA.css 41 {3} [built]
        cjs require ./styleA.css [0] ./a.js 2:0-23
Child extract-text-webpack-plugin:
                                   Asset  Size  Chunks       Chunk Names
    d090b6fba0f6d326d282a19146ff54a7.png   120               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\styleA.css 166 [rendered]
        > [0] (webpack)/~/css-loader!./styleA.css 
        [0] (webpack)/~/css-loader!./styleA.css 85 {0} [built]
        [1] ./imageA.png 81 {0} [built]
            cjs require ./imageA.png [0] (webpack)/~/css-loader!./styleA.css 2:30-53
Child extract-text-webpack-plugin:
                                   Asset  Size  Chunks       Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\style.css 167 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 86 {0} [built]
        [1] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:32-54
Child extract-text-webpack-plugin:
                                   Asset  Size  Chunks       Chunk Names
    c2a2f62d69330b7d787782f5010f9d13.png   120               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\styleC.css 166 [rendered]
        > [0] (webpack)/~/css-loader!./styleC.css 
        [0] (webpack)/~/css-loader!./styleC.css 85 {0} [built]
        [1] ./imageC.png 81 {0} [built]
            cjs require ./imageC.png [0] (webpack)/~/css-loader!./styleC.css 2:30-53
Child extract-text-webpack-plugin:
                                   Asset  Size  Chunks       Chunk Names
    16155c689e517682064c99893cb832cc.png   120               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\styleB.css 166 [rendered]
        > [0] (webpack)/~/css-loader!./styleB.css 
        [0] (webpack)/~/css-loader!./styleB.css 85 {0} [built]
        [1] ./imageB.png 81 {0} [built]
            cjs require ./imageB.png [0] (webpack)/~/css-loader!./styleB.css 2:30-53
```

## Minimized (uglify-js, no zip)

```
Hash: 91ca5e0353e09572847f
Version: webpack 1.3.2-beta8
Time: 306ms
                               Asset  Size  Chunks             Chunk Names
                               C.css   120          [emitted]  
16155c689e517682064c99893cb832cc.png   120          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png   120          [emitted]  
                               B.css    59          [emitted]  
                               A.css    59          [emitted]  
d090b6fba0f6d326d282a19146ff54a7.png   120          [emitted]  
                         commons.css    61          [emitted]  
                                C.js   260    0, 1  [emitted]  C
                          commons.js   735       1  [emitted]  commons
                                B.js    62       2  [emitted]  B
                                A.js    61       3  [emitted]  A
chunk    {0} C.js (C) 133 [rendered]
    > C [0] ./c.js 
    [0] ./c.js 51 {0} [built]
    [1] ./style.css 41 {0} {1} [built]
        cjs require ./style.css [0] ./a.js 1:0-22
        cjs require ./style.css [0] ./b.js 1:0-22
        cjs require ./style.css [0] ./c.js 1:0-22
    [4] ./styleC.css 41 {0} [built]
        cjs require ./styleC.css [0] ./c.js 2:0-23
chunk    {1} commons.js (commons) 41 [rendered]
    [1] ./style.css 41 {0} {1} [built]
        cjs require ./style.css [0] ./a.js 1:0-22
        cjs require ./style.css [0] ./b.js 1:0-22
        cjs require ./style.css [0] ./c.js 1:0-22
chunk    {2} B.js (B) 92 {1} [rendered]
    > B [0] ./b.js 
    [0] ./b.js 51 {2} [built]
    [3] ./styleB.css 41 {2} [built]
        cjs require ./styleB.css [0] ./b.js 2:0-23
chunk    {3} A.js (A) 92 {1} [rendered]
    > A [0] ./a.js 
    [0] ./a.js 51 {3} [built]
    [2] ./styleA.css 41 {3} [built]
        cjs require ./styleA.css [0] ./a.js 2:0-23
Child extract-text-webpack-plugin:
                                   Asset  Size  Chunks       Chunk Names
    16155c689e517682064c99893cb832cc.png   120               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\styleB.css 149 [rendered]
        > [0] (webpack)/~/css-loader!./styleB.css 
        [0] (webpack)/~/css-loader!./styleB.css 68 {0} [built]
        [1] ./imageB.png 81 {0} [built]
            cjs require ./imageB.png [0] (webpack)/~/css-loader!./styleB.css 2:22-45
Child extract-text-webpack-plugin:
                                   Asset  Size  Chunks       Chunk Names
    d090b6fba0f6d326d282a19146ff54a7.png   120               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\styleA.css 149 [rendered]
        > [0] (webpack)/~/css-loader!./styleA.css 
        [0] (webpack)/~/css-loader!./styleA.css 68 {0} [built]
        [1] ./imageA.png 81 {0} [built]
            cjs require ./imageA.png [0] (webpack)/~/css-loader!./styleA.css 2:22-45
Child extract-text-webpack-plugin:
                                   Asset  Size  Chunks       Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\style.css 150 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 69 {0} [built]
        [1] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:24-46
Child extract-text-webpack-plugin:
                                   Asset  Size  Chunks       Chunk Names
    c2a2f62d69330b7d787782f5010f9d13.png   120               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\styleC.css 149 [rendered]
        > [0] (webpack)/~/css-loader!./styleC.css 
        [0] (webpack)/~/css-loader!./styleC.css 68 {0} [built]
        [1] ./imageC.png 81 {0} [built]
            cjs require ./imageC.png [0] (webpack)/~/css-loader!./styleC.css 2:22-45
```
