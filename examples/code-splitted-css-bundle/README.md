
# example.js

``` javascript
require("./style.css");
require(["./chunk"]);
```

# style.css

``` css
body {
	background: url(image.png);
}
```

# chunk.js

``` javascript
require("./style2.css");
```

# style2.css

``` css
.xyz {
	background: url(image2.png);
}
```

# webpack.config.js

``` javascript
var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
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
		new ExtractTextPlugin("style.css")
	]
};
```

# js/style.css

``` javascript
body {
	background: url(js/ce21cbdd9b894e6af794813eb3fdaf60.png);
}
```

# Info

## Uncompressed

```
Hash: 798f77cd46cc3238c154
Version: webpack 2.1.0-beta.11
Time: 796ms
                               Asset       Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
                           output.js    14.3 kB       0  [emitted]  main
                                1.js    2.06 kB       1  [emitted]  
                           style.css   71 bytes       0  [emitted]  main
chunk    {0} output.js, style.css (main) 8.81 kB [rendered]
    > main [2] ./example.js 
    [0] ./style.css 41 bytes {0} [built]
        cjs require ./style.css [2] ./example.js 1:0-22
    [2] ./example.js 48 bytes {0} [built]
    [3] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
        cjs require ./../../node_modules/css-loader/lib/css-base.js [5] (webpack)/~/css-loader!./style2.css 1:27-85
        cjs require ./../../node_modules/css-loader/lib/css-base.js [8] (webpack)/~/css-loader!./style.css 1:27-85
    [4] (webpack)/~/style-loader/addStyles.js 7.21 kB {0} [built]
        cjs require !./../../node_modules/style-loader/addStyles.js [6] ./style2.css 7:13-71
chunk    {1} 1.js 1.26 kB {0} [rendered]
    > [2] ./example.js 2:0-20
    [1] ./chunk.js 26 bytes {1} [built]
        amd require ./chunk [2] ./example.js 2:0-20
    [5] (webpack)/~/css-loader!./style2.css 229 bytes {1} [built]
        cjs require !!./../../node_modules/css-loader/index.js!./style2.css [6] ./style2.css 4:14-80
    [6] ./style2.css 922 bytes {1} [built]
        cjs require ./style2.css [1] ./chunk.js 1:0-23
    [7] ./image2.png 82 bytes {1} [built]
        cjs require ./image2.png [5] (webpack)/~/css-loader!./style2.css 6:58-81
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.82 kB [rendered]
        > [2] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        [1] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 6:58-80
        [2] (webpack)/~/css-loader!./style.css 228 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 0cf75f910a1d3f58460d
Version: webpack 2.1.0-beta.11
Time: 1451ms
                               Asset       Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
                           output.js    4.79 kB       0  [emitted]  main
                                1.js  309 bytes       1  [emitted]  
                           style.css   61 bytes       0  [emitted]  main
chunk    {0} output.js, style.css (main) 8.81 kB [rendered]
    > main [2] ./example.js 
    [0] ./style.css 41 bytes {0} [built]
        cjs require ./style.css [2] ./example.js 1:0-22
    [2] ./example.js 48 bytes {0} [built]
    [3] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
        cjs require ./../../node_modules/css-loader/lib/css-base.js [5] (webpack)/~/css-loader!./style2.css 1:27-85
        cjs require ./../../node_modules/css-loader/lib/css-base.js [8] (webpack)/~/css-loader!./style.css 1:27-85
    [4] (webpack)/~/style-loader/addStyles.js 7.21 kB {0} [built]
        cjs require !./../../node_modules/style-loader/addStyles.js [6] ./style2.css 7:13-71
chunk    {1} 1.js 1.24 kB {0} [rendered]
    > [2] ./example.js 2:0-20
    [1] ./chunk.js 26 bytes {1} [built]
        amd require ./chunk [2] ./example.js 2:0-20
    [5] (webpack)/~/css-loader!./style2.css 212 bytes {1} [built]
        cjs require !!./../../node_modules/css-loader/index.js!./style2.css [6] ./style2.css 4:14-80
    [6] ./style2.css 922 bytes {1} [built]
        cjs require ./style2.css [1] ./chunk.js 1:0-23
    [7] ./image2.png 82 bytes {1} [built]
        cjs require ./image2.png [5] (webpack)/~/css-loader!./style2.css 6:50-73
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.8 kB [rendered]
        > [2] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        [1] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 6:50-72
        [2] (webpack)/~/css-loader!./style.css 211 bytes {0} [built]
```
