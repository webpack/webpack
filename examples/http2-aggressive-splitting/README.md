This example demonstrates how to split the bundle into multiple smaller chunks to improve caching using `optimization.splitChunks` with a `maxSize`. This works best with an HTTP2 web server, otherwise, there is an overhead for the increased number of requests.

Setting `maxSize` tells webpack to split chunks that are bigger than this size into smaller ones. In this example, it tries to create chunks with <50kB raw code, which typically minimizes to ~10kB. Modules are grouped by folder structure, because modules in the same folder are likely to have similar repetitive text, making them gzip efficiently together. They are also likely to change together.

`chunks: "all"` applies the splitting to all chunks, including the initial ones. Chunk content is deterministic, so the same `[chunkhash]` is emitted as long as a chunk's modules don't change. Since changes to application code between one build and the next are usually in only a few modules, the unchanged chunks keep their hash and stay in the client's cache.

There is a tradeoff here:

The caching improves with smaller `maxSize`, as chunks change less often and can be reused more often after an update.

The compression improves with bigger `maxSize`, as gzip works better for bigger files. It's more likely to find duplicate strings, etc.

The backward compatibility (non-HTTP2 client) improves with bigger `maxSize`, as the number of requests decreases.

```js
"use strict";

const path = require("path");
const webpack = require("../../");

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	entry: "./example",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 30000,
			maxSize: 50000
		}
	},
	plugins: [
		new webpack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify("production")
		})
	]
};

module.exports = config;
```

# Info

## Unoptimized

```
asset c7731e1b451590230a75.js 37.2 KiB [emitted] [immutable] (name: main)
asset 6136ed90a731a1f7d2a3.js 12 KiB [emitted] [immutable]
chunk (runtime: main) c7731e1b451590230a75.js (main) 17 KiB (javascript) 4.92 KiB (runtime) [entry] [rendered]
  > ./example main
  runtime modules 4.92 KiB 6 modules
  dependent modules 17 KiB [dependent] 2 modules
  ./example.js 42 bytes [built] [code generated]
chunk (runtime: main) 6136ed90a731a1f7d2a3.js 7.83 KiB [rendered]
  > react-dom ./example.js 2:0-22
  dependent modules 6.5 KiB [dependent] 1 module
  ../../node_modules/react-dom/index.js 1.33 KiB [built] [code generated]
webpack X.X.X compiled successfully
```

## Production mode

```
asset 7ca3ef3fdbb2a836fdc1.js 9.05 KiB [emitted] [immutable] [minimized] (name: main) 1 related asset
asset 0bd063af5520128b2714.js 3.55 KiB [emitted] [immutable] [minimized] 1 related asset
chunk (runtime: main) 0bd063af5520128b2714.js 7.83 KiB [rendered]
  > react-dom ./example.js 2:0-22
  dependent modules 6.5 KiB [dependent] 1 module
  ../../node_modules/react-dom/index.js 1.33 KiB [built] [code generated]
chunk (runtime: main) 7ca3ef3fdbb2a836fdc1.js (main) 17 KiB (javascript) 4.92 KiB (runtime) [entry] [rendered]
  > ./example main
  runtime modules 4.92 KiB 6 modules
  dependent modules 17 KiB [dependent] 2 modules
  ./example.js 42 bytes [built] [code generated]
webpack X.X.X compiled successfully
```
