
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

# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
	entry: {
		A: "./a",
		B: "./b",
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js"
	},
	module: {
		loaders: [
			{
				test: /\.css$/,
				loaders: [
					ExtractTextPlugin.loader({ remove: true, extract: false }),
					"style-loader",
					ExtractTextPlugin.loader({ remove: true }),
					"css-loader"
				]
			},
			{ test: /\.png$/, loader: "file-loader" }
		]
	},
	plugins: [
		new CommonsChunkPlugin("commons", "commons.js"),
		new ExtractTextPlugin("[name].css"),
	]
};
```

# js/A.js

``` javascript
webpackJsonp([2],[
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
	background: url(js/ce21cbdd9b894e6af794813eb3fdaf60.png);
}
```

# js/B.css

``` css
.b {
	background: url(js/ce21cbdd9b894e6af794813eb3fdaf60.png);
}
```

# js/B.css (Minimized)

``` css
.b{background:url(js/ce21cbdd9b894e6af794813eb3fdaf60.png)}
```

# Info

## Uncompressed

```
Hash: 6b69ef41596456c4f8d6
Version: webpack 1.3.2-beta2
Time: 149ms
                               Asset  Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
                               B.css    69          [emitted]  
                               A.css    69          [emitted]  
                         commons.css    71          [emitted]  
                          commons.js  3828       0  [emitted]  commons
                                B.js   458       1  [emitted]  B
                                A.js   449       2  [emitted]  A
chunk    {0} commons.js (commons) 41 [rendered]
    [1] ./style.css 41 {0} [built]
        cjs require ./style.css [0] ./a.js 1:0-22
        cjs require ./style.css [0] ./b.js 1:0-22
chunk    {1} B.js (B) 92 {0} [rendered]
    > B [0] ./b.js 
    [0] ./b.js 51 {1} [built]
    [3] ./styleB.css 41 {1} [built]
        cjs require ./styleB.css [0] ./b.js 2:0-23
chunk    {2} A.js (A) 92 {0} [rendered]
    > A [0] ./a.js 
    [0] ./a.js 51 {2} [built]
    [2] ./styleA.css 41 {2} [built]
        cjs require ./styleA.css [0] ./a.js 2:0-23
Child extract-text-webpack-plugin:
    Hash: 348c5f3c59be93186d16
    Version: webpack 1.3.2-beta2
                                   Asset  Size  Chunks       Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\styleB.css 166 [rendered]
        > [0] (webpack)/~/css-loader!./styleB.css 
        [0] (webpack)/~/css-loader!./styleB.css 85 {0} [built]
        [1] ./imageB.png 81 {0} [built]
            cjs require ./imageB.png [0] (webpack)/~/css-loader!./styleB.css 2:30-53
Child extract-text-webpack-plugin:
    Hash: 0034e9049b2a217b97d2
    Version: webpack 1.3.2-beta2
                                   Asset  Size  Chunks       Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\styleA.css 166 [rendered]
        > [0] (webpack)/~/css-loader!./styleA.css 
        [0] (webpack)/~/css-loader!./styleA.css 85 {0} [built]
        [1] ./imageA.png 81 {0} [built]
            cjs require ./imageA.png [0] (webpack)/~/css-loader!./styleA.css 2:30-53
Child extract-text-webpack-plugin:
    Hash: e8f7a60f8e3c792aafd8
    Version: webpack 1.3.2-beta2
                                   Asset  Size  Chunks       Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\style.css 167 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 86 {0} [built]
        [1] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:32-54
```

## Minimized (uglify-js, no zip)

```
Hash: 3a97b6bdec5fad87670c
Version: webpack 1.3.2-beta2
Time: 263ms
                               Asset  Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
                               A.css    59          [emitted]  
                               B.css    59          [emitted]  
                         commons.css    61          [emitted]  
                          commons.js   735       0  [emitted]  commons
                                B.js    62       1  [emitted]  B
                                A.js    61       2  [emitted]  A
chunk    {0} commons.js (commons) 41 [rendered]
    [1] ./style.css 41 {0} [built]
        cjs require ./style.css [0] ./a.js 1:0-22
        cjs require ./style.css [0] ./b.js 1:0-22
chunk    {1} B.js (B) 92 {0} [rendered]
    > B [0] ./b.js 
    [0] ./b.js 51 {1} [built]
    [3] ./styleB.css 41 {1} [built]
        cjs require ./styleB.css [0] ./b.js 2:0-23
chunk    {2} A.js (A) 92 {0} [rendered]
    > A [0] ./a.js 
    [0] ./a.js 51 {2} [built]
    [2] ./styleA.css 41 {2} [built]
        cjs require ./styleA.css [0] ./a.js 2:0-23
Child extract-text-webpack-plugin:
    Hash: b261156748d152eea7b4
    Version: webpack 1.3.2-beta2
                                   Asset  Size  Chunks       Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\styleA.css 149 [rendered]
        > [0] (webpack)/~/css-loader!./styleA.css 
        [0] (webpack)/~/css-loader!./styleA.css 68 {0} [built]
        [1] ./imageA.png 81 {0} [built]
            cjs require ./imageA.png [0] (webpack)/~/css-loader!./styleA.css 2:22-45
Child extract-text-webpack-plugin:
    Hash: 92640582622bed035d00
    Version: webpack 1.3.2-beta2
                                   Asset  Size  Chunks       Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\styleB.css 149 [rendered]
        > [0] (webpack)/~/css-loader!./styleB.css 
        [0] (webpack)/~/css-loader!./styleB.css 68 {0} [built]
        [1] ./imageB.png 81 {0} [built]
            cjs require ./imageB.png [0] (webpack)/~/css-loader!./styleB.css 2:22-45
Child extract-text-webpack-plugin:
    Hash: e5269f7f4a8ac27f01e2
    Version: webpack 1.3.2-beta2
                                   Asset  Size  Chunks       Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\style.css 150 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 69 {0} [built]
        [1] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:24-46
```