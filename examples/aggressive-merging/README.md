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
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	}
};
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.11
          Asset       Size  Chunks             Chunk Names
   394.chunk.js  548 bytes   {394}  [emitted]
   456.chunk.js   6.19 KiB   {456}  [emitted]
pageA.bundle.js   7.51 KiB   {424}  [emitted]  pageA
pageB.bundle.js   7.52 KiB   {121}  [emitted]  pageB
pageC.bundle.js   7.51 KiB   {178}  [emitted]  pageC
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
chunk {121} pageB.bundle.js (pageB) 69 bytes (javascript) 3.64 KiB (runtime) [entry] [rendered]
    > ./pageB pageB
 [1] ./pageB.js 69 bytes {121} [built]
     [used exports unknown]
     entry ./pageB pageB
     + 4 hidden chunk modules
chunk {178} pageC.bundle.js (pageC) 68 bytes (javascript) 3.64 KiB (runtime) [entry] [rendered]
    > ./pageC pageC
 [2] ./pageC.js 68 bytes {178} [built]
     [used exports unknown]
     entry ./pageC pageC
     + 4 hidden chunk modules
chunk {394} 394.chunk.js 42 bytes [rendered]
    > ./a [2] ./pageC.js 1:0-3:2
 [4] ./a.js 21 bytes {394} {456} [built]
     [used exports unknown]
     cjs require ./a [0] ./pageA.js 2:8-22
     amd require ./a [2] ./pageC.js 1:0-3:2
 [5] ./b.js 21 bytes {394} {456} [built]
     [used exports unknown]
     cjs require ./b [1] ./pageB.js 2:8-22
     cjs require ./b [2] ./pageC.js 2:17-31
chunk {424} pageA.bundle.js (pageA) 69 bytes (javascript) 3.64 KiB (runtime) [entry] [rendered]
    > ./pageA pageA
 [0] ./pageA.js 69 bytes {424} [built]
     [used exports unknown]
     entry ./pageA pageA
     + 4 hidden chunk modules
chunk {456} 456.chunk.js 5.45 KiB [rendered]
    > ./common [0] ./pageA.js 1:0-3:2
    > ./common [1] ./pageB.js 1:0-3:2
 [3] ./common.js 5.41 KiB {456} [built]
     [used exports unknown]
     amd require ./common [0] ./pageA.js 1:0-3:2
     amd require ./common [1] ./pageB.js 1:0-3:2
 [4] ./a.js 21 bytes {394} {456} [built]
     [used exports unknown]
     cjs require ./a [0] ./pageA.js 2:8-22
     amd require ./a [2] ./pageC.js 1:0-3:2
 [5] ./b.js 21 bytes {394} {456} [built]
     [used exports unknown]
     cjs require ./b [1] ./pageB.js 2:8-22
     cjs require ./b [2] ./pageC.js 2:17-31
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.11
          Asset       Size        Chunks             Chunk Names
   394.chunk.js  124 bytes         {394}  [emitted]
   456.chunk.js  183 bytes  {394}, {456}  [emitted]
pageA.bundle.js   1.42 KiB         {424}  [emitted]  pageA
pageB.bundle.js   1.42 KiB         {121}  [emitted]  pageB
pageC.bundle.js   1.44 KiB         {178}  [emitted]  pageC
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
chunk {121} pageB.bundle.js (pageB) 69 bytes (javascript) 3.64 KiB (runtime) [entry] [rendered]
    > ./pageB pageB
 [588] ./pageB.js 69 bytes {121} [built]
       entry ./pageB pageB
     + 4 hidden chunk modules
chunk {178} pageC.bundle.js (pageC) 68 bytes (javascript) 3.64 KiB (runtime) [entry] [rendered]
    > ./pageC pageC
 [145] ./pageC.js 68 bytes {178} [built]
       entry ./pageC pageC
     + 4 hidden chunk modules
chunk {394} 394.chunk.js 42 bytes [rendered]
    > ./a [145] ./pageC.js 1:0-3:2
 [847] ./a.js 21 bytes {394} {456} [built]
       amd require ./a [145] ./pageC.js 1:0-3:2
       cjs require ./a [366] ./pageA.js 2:8-22
 [996] ./b.js 21 bytes {394} {456} [built]
       cjs require ./b [145] ./pageC.js 2:17-31
       cjs require ./b [588] ./pageB.js 2:8-22
chunk {424} pageA.bundle.js (pageA) 69 bytes (javascript) 3.64 KiB (runtime) [entry] [rendered]
    > ./pageA pageA
 [366] ./pageA.js 69 bytes {424} [built]
       entry ./pageA pageA
     + 4 hidden chunk modules
chunk {456} 456.chunk.js 5.45 KiB [rendered]
    > ./common [366] ./pageA.js 1:0-3:2
    > ./common [588] ./pageB.js 1:0-3:2
 [543] ./common.js 5.41 KiB {456} [built]
       amd require ./common [366] ./pageA.js 1:0-3:2
       amd require ./common [588] ./pageB.js 1:0-3:2
 [847] ./a.js 21 bytes {394} {456} [built]
       amd require ./a [145] ./pageC.js 1:0-3:2
       cjs require ./a [366] ./pageA.js 2:8-22
 [996] ./b.js 21 bytes {394} {456} [built]
       cjs require ./b [145] ./pageC.js 2:17-31
       cjs require ./b [588] ./pageB.js 2:8-22
```
