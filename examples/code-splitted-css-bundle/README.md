
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
const LoaderOptionsPlugin = require("../../lib/LoaderOptionsPlugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
	mode: "production",
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
		new ExtractTextPlugin({
			filename: "style.css"
		}),
		// Temporary workaround for the file-loader
		new LoaderOptionsPlugin({
			options: {}
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
Hash: 07cd62e8204ce12e5e90
Version: webpack next
                               Asset       Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
                         0.output.js    2.7 KiB       0  [emitted]  
                           output.js   22.1 KiB       1  [emitted]  main
                           style.css   71 bytes       1  [emitted]  main
Entrypoint main = output.js style.css
chunk    {0} 0.output.js 1.33 KiB {1} [rendered]
    > [0] ./example.js 2:0-20
    [5] ./chunk.js 26 bytes {0} [built]
        amd require ./chunk [0] ./example.js 2:0-20
    [6] ./style2.css 1020 bytes {0} [built]
        cjs require ./style2.css [5] ./chunk.js 1:0-23
    [7] (webpack)/node_modules/css-loader!./style2.css 236 bytes {0} [built]
        cjs require !!../../node_modules/css-loader/index.js!./style2.css [6] ./style2.css 4:14-78
    [8] ./image2.png 82 bytes {0} [built]
        cjs require ./image2.png [7] (webpack)/node_modules/css-loader!./style2.css 6:58-81
chunk    {1} output.js, style.css (main) 13.7 KiB [entry] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 48 bytes {1} [built]
        single entry .\example.js  main
    [1] ./style.css 41 bytes {1} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
     + 3 hidden modules
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
```

## Minimized (uglify-js, no zip)

```
Hash: 875c8c7227c51a7a972d
Version: webpack next
                               Asset       Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
                         0.output.js  383 bytes       0  [emitted]  
                           output.js    6.7 KiB       1  [emitted]  main
                           style.css   61 bytes       1  [emitted]  main
Entrypoint main = output.js style.css
chunk    {0} 0.output.js 1.31 KiB {1} [rendered]
    > [0] ./example.js 2:0-20
    [5] ./chunk.js 26 bytes {0} [built]
        amd require ./chunk [0] ./example.js 2:0-20
    [6] ./style2.css 1020 bytes {0} [built]
        cjs require ./style2.css [5] ./chunk.js 1:0-23
    [7] (webpack)/node_modules/css-loader!./style2.css 219 bytes {0} [built]
        cjs require !!../../node_modules/css-loader/index.js!./style2.css [6] ./style2.css 4:14-78
    [8] ./image2.png 82 bytes {0} [built]
        cjs require ./image2.png [7] (webpack)/node_modules/css-loader!./style2.css 6:50-73
chunk    {1} output.js, style.css (main) 13.7 KiB [entry] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 48 bytes {1} [built]
        single entry .\example.js  main
    [1] ./style.css 41 bytes {1} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
     + 3 hidden modules
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
```
