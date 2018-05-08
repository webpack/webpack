# pageA.js

``` javascript
require(["./common"], function(common) {
	common(require("./a"));
});
```

# pageB.js

``` javascript
require(["./common"], function(common) {
	common(require("./b"));
});
```

# pageC.js

``` javascript
require(["./a"], function(a) {
	console.log(a + require("./b"));
});
```

# common.js

a big file...

# webpack.config.js

``` javascript
var path = require("path");
var AggressiveMergingPlugin = require("../../lib/optimize/AggressiveMergingPlugin");
module.exports = {
	// mode: "development" || "production",
	entry: {
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].bundle.js",
		chunkFilename: "[id].chunk.js"
	},
	plugins: [
		new AggressiveMergingPlugin({
			minSizeReduce: 1.5
		})
	],
	optimization: {
		occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
	}
};
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
          Asset       Size  Chunks             Chunk Names
     0.chunk.js   5.98 KiB       0  [emitted]  
     1.chunk.js  405 bytes       1  [emitted]  
pageC.bundle.js   7.32 KiB       2  [emitted]  pageC
pageB.bundle.js   7.32 KiB       3  [emitted]  pageB
pageA.bundle.js   7.32 KiB       4  [emitted]  pageA
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
chunk    {0} 0.chunk.js 5.46 KiB <{3}> <{4}> [rendered]
    > ./common [4] ./pageB.js 1:0-3:2
    > ./common [5] ./pageA.js 1:0-3:2
 [0] ./b.js 21 bytes {0} {1} [built]
     cjs require ./b [3] ./pageC.js 2:17-31
     cjs require ./b [4] ./pageB.js 2:8-22
 [1] ./a.js 21 bytes {0} {1} [built]
     amd require ./a [3] ./pageC.js 1:0-3:2
     cjs require ./a [5] ./pageA.js 2:8-22
 [2] ./common.js 5.42 KiB {0} [built]
     amd require ./common [4] ./pageB.js 1:0-3:2
     amd require ./common [5] ./pageA.js 1:0-3:2
chunk    {1} 1.chunk.js 42 bytes <{2}> [rendered]
    > ./a [3] ./pageC.js 1:0-3:2
 [0] ./b.js 21 bytes {0} {1} [built]
     cjs require ./b [3] ./pageC.js 2:17-31
     cjs require ./b [4] ./pageB.js 2:8-22
 [1] ./a.js 21 bytes {0} {1} [built]
     amd require ./a [3] ./pageC.js 1:0-3:2
     cjs require ./a [5] ./pageA.js 2:8-22
chunk    {2} pageC.bundle.js (pageC) 70 bytes >{1}< [entry] [rendered]
    > ./pageC pageC
 [3] ./pageC.js 70 bytes {2} [built]
     single entry ./pageC  pageC
chunk    {3} pageB.bundle.js (pageB) 71 bytes >{0}< [entry] [rendered]
    > ./pageB pageB
 [4] ./pageB.js 71 bytes {3} [built]
     single entry ./pageB  pageB
chunk    {4} pageA.bundle.js (pageA) 71 bytes >{0}< [entry] [rendered]
    > ./pageA pageA
 [5] ./pageA.js 71 bytes {4} [built]
     single entry ./pageA  pageA
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
          Asset       Size  Chunks             Chunk Names
     0.chunk.js  173 bytes    0, 1  [emitted]  
     1.chunk.js  118 bytes       1  [emitted]  
pageC.bundle.js    1.7 KiB       2  [emitted]  pageC
pageB.bundle.js   1.69 KiB       3  [emitted]  pageB
pageA.bundle.js   1.69 KiB       4  [emitted]  pageA
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
chunk    {0} 0.chunk.js 5.46 KiB <{3}> <{4}> [rendered]
    > ./common [4] ./pageB.js 1:0-3:2
    > ./common [5] ./pageA.js 1:0-3:2
 [0] ./b.js 21 bytes {0} {1} [built]
     cjs require ./b [3] ./pageC.js 2:17-31
     cjs require ./b [4] ./pageB.js 2:8-22
 [1] ./a.js 21 bytes {0} {1} [built]
     amd require ./a [3] ./pageC.js 1:0-3:2
     cjs require ./a [5] ./pageA.js 2:8-22
 [2] ./common.js 5.42 KiB {0} [built]
     amd require ./common [4] ./pageB.js 1:0-3:2
     amd require ./common [5] ./pageA.js 1:0-3:2
chunk    {1} 1.chunk.js 42 bytes <{2}> [rendered]
    > ./a [3] ./pageC.js 1:0-3:2
 [0] ./b.js 21 bytes {0} {1} [built]
     cjs require ./b [3] ./pageC.js 2:17-31
     cjs require ./b [4] ./pageB.js 2:8-22
 [1] ./a.js 21 bytes {0} {1} [built]
     amd require ./a [3] ./pageC.js 1:0-3:2
     cjs require ./a [5] ./pageA.js 2:8-22
chunk    {2} pageC.bundle.js (pageC) 70 bytes >{1}< [entry] [rendered]
    > ./pageC pageC
 [3] ./pageC.js 70 bytes {2} [built]
     single entry ./pageC  pageC
chunk    {3} pageB.bundle.js (pageB) 71 bytes >{0}< [entry] [rendered]
    > ./pageB pageB
 [4] ./pageB.js 71 bytes {3} [built]
     single entry ./pageB  pageB
chunk    {4} pageA.bundle.js (pageA) 71 bytes >{0}< [entry] [rendered]
    > ./pageA pageA
 [5] ./pageA.js 71 bytes {4} [built]
     single entry ./pageA  pageA
```
