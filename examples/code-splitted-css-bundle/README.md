
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
				use: ExtractTextPlugin.extract({
					fallback: "style-loader",
					use: "css-loader"
				})
			},
			{ test: /\.png$/, loader: "file-loader" }
		]
	},
	plugins: [
		new ExtractTextPlugin({
			filename: "style.css"
		})
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
Hash: 5e50fc342714ad0f1d72
Version: webpack 3.0.0-rc.0
                               Asset       Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
                         0.output.js    2.43 kB       0  [emitted]  
                           output.js    21.2 kB       1  [emitted]  main
                           style.css   71 bytes       1  [emitted]  main
Entrypoint main = output.js style.css
chunk    {0} 0.output.js 1.36 kB {1} [rendered]
    > [0] ./example.js 2:0-20
    [5] ./chunk.js 26 bytes {0} [built]
        amd require ./chunk [0] ./example.js 2:0-20
    [6] ./style2.css 1.01 kB {0} [built]
        cjs require ./style2.css [5] ./chunk.js 1:0-23
    [7] (webpack)/node_modules/css-loader!./style2.css 236 bytes {0} [built]
        cjs require !!../../node_modules/css-loader/index.js!./style2.css [6] ./style2.css 4:14-78
    [8] ./image2.png 82 bytes {0} [built]
        cjs require ./image2.png [7] (webpack)/node_modules/css-loader!./style2.css 6:58-81
chunk    {1} output.js, style.css (main) 14 kB [entry] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 48 bytes {1} [built]
    [1] ./style.css 41 bytes {1} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
    [2] (webpack)/node_modules/style-loader/lib/urls.js 3.01 kB {1} [built]
        cjs require ./urls [4] (webpack)/node_modules/style-loader/lib/addStyles.js 44:14-31
    [3] (webpack)/node_modules/css-loader/lib/css-base.js 2.26 kB {1} [built]
        cjs require ../../node_modules/css-loader/lib/css-base.js [7] (webpack)/node_modules/css-loader!./style2.css 1:27-83
        cjs require ../../node_modules/css-loader/lib/css-base.js [9] (webpack)/node_modules/css-loader!./style.css 1:27-83
    [4] (webpack)/node_modules/style-loader/lib/addStyles.js 8.66 kB {1} [built]
        cjs require !../../node_modules/style-loader/lib/addStyles.js [6] ./style2.css 12:13-73
Child extract-text-webpack-plugin:
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.58 kB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./style.css 
        [0] (webpack)/node_modules/css-loader!./style.css 235 bytes {0} [built]
        [1] (webpack)/node_modules/css-loader/lib/css-base.js 2.26 kB {0} [built]
            cjs require ../../node_modules/css-loader/lib/css-base.js [0] (webpack)/node_modules/css-loader!./style.css 1:27-83
        [2] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [0] (webpack)/node_modules/css-loader!./style.css 6:58-80
```

## Minimized (uglify-js, no zip)

```
Hash: 59425fc9ef44552557cd
Version: webpack 3.0.0-rc.0
                               Asset       Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
                         0.output.js  343 bytes       0  [emitted]  
                           output.js    6.55 kB       1  [emitted]  main
                           style.css   61 bytes       1  [emitted]  main
Entrypoint main = output.js style.css
chunk    {0} 0.output.js 1.34 kB {1} [rendered]
    > [0] ./example.js 2:0-20
    [5] ./chunk.js 26 bytes {0} [built]
        amd require ./chunk [0] ./example.js 2:0-20
    [6] ./style2.css 1.01 kB {0} [built]
        cjs require ./style2.css [5] ./chunk.js 1:0-23
    [7] (webpack)/node_modules/css-loader!./style2.css 219 bytes {0} [built]
        cjs require !!../../node_modules/css-loader/index.js!./style2.css [6] ./style2.css 4:14-78
    [8] ./image2.png 82 bytes {0} [built]
        cjs require ./image2.png [7] (webpack)/node_modules/css-loader!./style2.css 6:50-73
chunk    {1} output.js, style.css (main) 14 kB [entry] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 48 bytes {1} [built]
    [1] ./style.css 41 bytes {1} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
    [2] (webpack)/node_modules/style-loader/lib/urls.js 3.01 kB {1} [built]
        cjs require ./urls [4] (webpack)/node_modules/style-loader/lib/addStyles.js 44:14-31
    [3] (webpack)/node_modules/css-loader/lib/css-base.js 2.26 kB {1} [built]
        cjs require ../../node_modules/css-loader/lib/css-base.js [7] (webpack)/node_modules/css-loader!./style2.css 1:27-83
        cjs require ../../node_modules/css-loader/lib/css-base.js [9] (webpack)/node_modules/css-loader!./style.css 1:27-83
    [4] (webpack)/node_modules/style-loader/lib/addStyles.js 8.66 kB {1} [built]
        cjs require !../../node_modules/style-loader/lib/addStyles.js [6] ./style2.css 12:13-73
Child extract-text-webpack-plugin:
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.56 kB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./style.css 
        [0] (webpack)/node_modules/css-loader!./style.css 218 bytes {0} [built]
        [1] (webpack)/node_modules/css-loader/lib/css-base.js 2.26 kB {0} [built]
            cjs require ../../node_modules/css-loader/lib/css-base.js [0] (webpack)/node_modules/css-loader!./style.css 1:27-83
        [2] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [0] (webpack)/node_modules/css-loader!./style.css 6:50-72
```
