# pageA.js

```javascript
require(["./common"], function(common) {
	common(require("./a"));
});
```

# pageB.js

```javascript
require(["./common"], function(common) {
	common(require("./b"));
});
```

# pageC.js

```javascript
require(["./a"], function(a) {
	console.log(a + require("./b"));
});
```

# common.js

a big file...

# webpack.config.js

```javascript
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
Version: webpack 4.39.0
          Asset       Size  Chunks             Chunk Names
     0.chunk.js   5.96 KiB       0  [emitted]  
     4.chunk.js  405 bytes       4  [emitted]  
pageA.bundle.js    8.5 KiB       1  [emitted]  pageA
pageB.bundle.js    8.5 KiB       2  [emitted]  pageB
pageC.bundle.js    8.5 KiB       3  [emitted]  pageC
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
chunk    {0} 0.chunk.js 5.45 KiB <{1}> <{2}> [rendered]
    > ./common [3] ./pageA.js 1:0-3:2
    > ./common [4] ./pageB.js 1:0-3:2
 [0] ./a.js 21 bytes {0} {4} [built]
     cjs require ./a [3] ./pageA.js 2:8-22
     amd require ./a [5] ./pageC.js 1:0-3:2
 [1] ./b.js 21 bytes {0} {4} [built]
     cjs require ./b [4] ./pageB.js 2:8-22
     cjs require ./b [5] ./pageC.js 2:17-31
 [2] ./common.js 5.41 KiB {0} [built]
     amd require ./common [3] ./pageA.js 1:0-3:2
     amd require ./common [4] ./pageB.js 1:0-3:2
chunk    {1} pageA.bundle.js (pageA) 69 bytes >{0}< [entry] [rendered]
    > ./pageA pageA
 [3] ./pageA.js 69 bytes {1} [built]
     single entry ./pageA  pageA
chunk    {2} pageB.bundle.js (pageB) 69 bytes >{0}< [entry] [rendered]
    > ./pageB pageB
 [4] ./pageB.js 69 bytes {2} [built]
     single entry ./pageB  pageB
chunk    {3} pageC.bundle.js (pageC) 68 bytes >{4}< [entry] [rendered]
    > ./pageC pageC
 [5] ./pageC.js 68 bytes {3} [built]
     single entry ./pageC  pageC
chunk    {4} 4.chunk.js 42 bytes <{3}> [rendered]
    > ./a [5] ./pageC.js 1:0-3:2
 [0] ./a.js 21 bytes {0} {4} [built]
     cjs require ./a [3] ./pageA.js 2:8-22
     amd require ./a [5] ./pageC.js 1:0-3:2
 [1] ./b.js 21 bytes {0} {4} [built]
     cjs require ./b [4] ./pageB.js 2:8-22
     cjs require ./b [5] ./pageC.js 2:17-31
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
          Asset       Size  Chunks             Chunk Names
     0.chunk.js  173 bytes    0, 4  [emitted]  
     4.chunk.js  118 bytes       4  [emitted]  
pageA.bundle.js   2.11 KiB       1  [emitted]  pageA
pageB.bundle.js   2.11 KiB       2  [emitted]  pageB
pageC.bundle.js   2.12 KiB       3  [emitted]  pageC
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
chunk    {0} 0.chunk.js 5.45 KiB <{1}> <{2}> [rendered]
    > ./common [3] ./pageA.js 1:0-3:2
    > ./common [4] ./pageB.js 1:0-3:2
 [0] ./a.js 21 bytes {0} {4} [built]
     cjs require ./a [3] ./pageA.js 2:8-22
     amd require ./a [5] ./pageC.js 1:0-3:2
 [1] ./b.js 21 bytes {0} {4} [built]
     cjs require ./b [4] ./pageB.js 2:8-22
     cjs require ./b [5] ./pageC.js 2:17-31
 [2] ./common.js 5.41 KiB {0} [built]
     amd require ./common [3] ./pageA.js 1:0-3:2
     amd require ./common [4] ./pageB.js 1:0-3:2
chunk    {1} pageA.bundle.js (pageA) 69 bytes >{0}< [entry] [rendered]
    > ./pageA pageA
 [3] ./pageA.js 69 bytes {1} [built]
     single entry ./pageA  pageA
chunk    {2} pageB.bundle.js (pageB) 69 bytes >{0}< [entry] [rendered]
    > ./pageB pageB
 [4] ./pageB.js 69 bytes {2} [built]
     single entry ./pageB  pageB
chunk    {3} pageC.bundle.js (pageC) 68 bytes >{4}< [entry] [rendered]
    > ./pageC pageC
 [5] ./pageC.js 68 bytes {3} [built]
     single entry ./pageC  pageC
chunk    {4} 4.chunk.js 42 bytes <{3}> [rendered]
    > ./a [5] ./pageC.js 1:0-3:2
 [0] ./a.js 21 bytes {0} {4} [built]
     cjs require ./a [3] ./pageA.js 2:8-22
     amd require ./a [5] ./pageC.js 1:0-3:2
 [1] ./b.js 21 bytes {0} {4} [built]
     cjs require ./b [4] ./pageB.js 2:8-22
     cjs require ./b [5] ./pageC.js 2:17-31
```
