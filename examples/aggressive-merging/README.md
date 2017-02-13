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
	entry: {
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].bundle.js",
		chunkFilename: "[id].chunk.js"
	},
	plugins: [
		new AggressiveMergingPlugin({
			minSizeReduce: 1.5,
			moveToParents: true
		})
	]
}
```

# Info

## Uncompressed

```
Hash: 06f18f1663d1b6555aff
Version: webpack 2.2.0-rc.2
          Asset       Size  Chunks             Chunk Names
     0.chunk.js    5.76 kB       0  [emitted]  
     1.chunk.js  397 bytes       1  [emitted]  
pageB.bundle.js    6.17 kB       2  [emitted]  pageB
pageA.bundle.js    6.14 kB       3  [emitted]  pageA
pageC.bundle.js    5.94 kB       4  [emitted]  pageC
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
chunk    {0} 0.chunk.js 5.55 kB {2} {3} [rendered]
    > aggressive-merge [3] ./pageA.js 1:0-3:2
    > aggressive-merge [4] ./pageB.js 1:0-3:2
    [2] ./common.js 5.55 kB {0} [built]
        amd require ./common [3] ./pageA.js 1:0-3:2
        amd require ./common [4] ./pageB.js 1:0-3:2
chunk    {1} 1.chunk.js 42 bytes {4} [rendered]
    > [5] ./pageC.js 1:0-3:2
    [0] ./a.js 21 bytes {1} {3} [built]
        cjs require ./a [3] ./pageA.js 2:8-22
        amd require ./a [5] ./pageC.js 1:0-3:2
    [1] ./b.js 21 bytes {1} {2} [built]
        cjs require ./b [4] ./pageB.js 2:8-22
        cjs require ./b [5] ./pageC.js 2:17-31
chunk    {2} pageB.bundle.js (pageB) 92 bytes [entry] [rendered]
    > pageB [4] ./pageB.js 
    [1] ./b.js 21 bytes {1} {2} [built]
        cjs require ./b [4] ./pageB.js 2:8-22
        cjs require ./b [5] ./pageC.js 2:17-31
    [4] ./pageB.js 71 bytes {2} [built]
chunk    {3} pageA.bundle.js (pageA) 92 bytes [entry] [rendered]
    > pageA [3] ./pageA.js 
    [0] ./a.js 21 bytes {1} {3} [built]
        cjs require ./a [3] ./pageA.js 2:8-22
        amd require ./a [5] ./pageC.js 1:0-3:2
    [3] ./pageA.js 71 bytes {3} [built]
chunk    {4} pageC.bundle.js (pageC) 70 bytes [entry] [rendered]
    > pageC [5] ./pageC.js 
    [5] ./pageC.js 70 bytes {4} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 06f18f1663d1b6555aff
Version: webpack 2.2.0-rc.2
          Asset      Size  Chunks             Chunk Names
     0.chunk.js  75 bytes       0  [emitted]  
     1.chunk.js  78 bytes       1  [emitted]  
pageB.bundle.js   1.48 kB       2  [emitted]  pageB
pageA.bundle.js   1.48 kB       3  [emitted]  pageA
pageC.bundle.js   1.46 kB       4  [emitted]  pageC
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
chunk    {0} 0.chunk.js 5.55 kB {2} {3} [rendered]
    > aggressive-merge [3] ./pageA.js 1:0-3:2
    > aggressive-merge [4] ./pageB.js 1:0-3:2
    [2] ./common.js 5.55 kB {0} [built]
        amd require ./common [3] ./pageA.js 1:0-3:2
        amd require ./common [4] ./pageB.js 1:0-3:2
chunk    {1} 1.chunk.js 42 bytes {4} [rendered]
    > [5] ./pageC.js 1:0-3:2
    [0] ./a.js 21 bytes {1} {3} [built]
        cjs require ./a [3] ./pageA.js 2:8-22
        amd require ./a [5] ./pageC.js 1:0-3:2
    [1] ./b.js 21 bytes {1} {2} [built]
        cjs require ./b [4] ./pageB.js 2:8-22
        cjs require ./b [5] ./pageC.js 2:17-31
chunk    {2} pageB.bundle.js (pageB) 92 bytes [entry] [rendered]
    > pageB [4] ./pageB.js 
    [1] ./b.js 21 bytes {1} {2} [built]
        cjs require ./b [4] ./pageB.js 2:8-22
        cjs require ./b [5] ./pageC.js 2:17-31
    [4] ./pageB.js 71 bytes {2} [built]
chunk    {3} pageA.bundle.js (pageA) 92 bytes [entry] [rendered]
    > pageA [3] ./pageA.js 
    [0] ./a.js 21 bytes {1} {3} [built]
        cjs require ./a [3] ./pageA.js 2:8-22
        amd require ./a [5] ./pageC.js 1:0-3:2
    [3] ./pageA.js 71 bytes {3} [built]
chunk    {4} pageC.bundle.js (pageC) 70 bytes [entry] [rendered]
    > pageC [5] ./pageC.js 
    [5] ./pageC.js 70 bytes {4} [built]
```
