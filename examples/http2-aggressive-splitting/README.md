This example demonstrates the AggressiveSplittingPlugin for splitting the bundle into multiple smaller chunks to improve caching. This works best with an HTTP2 web server, otherwise, there is an overhead for the increased number of requests.

AggressiveSplittingPlugin splits every chunk until it reaches the specified `maxSize`. In this example, it tries to create chunks with <50kB raw code, which typically minimizes to ~10kB. It groups modules by folder structure, because modules in the same folder are likely to have similar repetitive text, making them gzip efficiently together. They are also likely to change together.

AggressiveSplittingPlugin records its splitting in the webpack records. When it is next run, it tries to use the last recorded splitting. Since changes to application code between one run and the next are usually in only a few modules (or just one), re-using the old splittings (and chunks, which are probably still in the client's cache), is highly advantageous.

Only chunks that are bigger than the specified `minSize` are stored into the records. This ensures that these chunks fill up as your application grows, instead of creating many records of small chunks for every change.

If a module changes, its chunks are declared to be invalid and are put back into the module pool. New chunks are created from all modules in the pool.

There is a tradeoff here:

The caching improves with smaller `maxSize`, as chunks change less often and can be reused more often after an update.

The compression improves with bigger `maxSize`, as gzip works better for bigger files. It's more likely to find duplicate strings, etc.

The backward compatibility (non-HTTP2 client) improves with bigger `maxSize`, as the number of requests decreases.

```js
const path = require("path");
const webpack = require("../../");

module.exports = {
	// mode: "development" || "production",
	cache: true, // better performance for the AggressiveSplittingPlugin
	entry: "./example",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	plugins: [
		new webpack.optimize.AggressiveSplittingPlugin({
			minSize: 30000,
			maxSize: 50000
		}),
		new webpack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify("production")
		})
	],
	recordsOutputPath: path.join(__dirname, "dist", "records.json")
};
```

# Info

## Unoptimized

```
asset 20d7a312b158a10e97d4.js 36.3 KiB [emitted] [immutable] (name: main)
asset 1bacc8037d20ba374848.js 12 KiB [emitted] [immutable]
chunk (runtime: main) 20d7a312b158a10e97d4.js (main) 16.9 KiB (javascript) 4.94 KiB (runtime) [entry] [rendered]
  > ./example main
  runtime modules 4.94 KiB 6 modules
  dependent modules 16.9 KiB [dependent] 2 modules
  ./example.js 42 bytes [built] [code generated]
chunk (runtime: main) 1bacc8037d20ba374848.js 7.83 KiB [rendered]
  > react-dom ./example.js 2:0-22
  dependent modules 6.5 KiB [dependent] 1 module
  ../../node_modules/react-dom/index.js 1.33 KiB [built] [code generated]
webpack X.X.X compiled successfully
```

## Production mode

```
asset 68dab3066399275cfe8c.js 9.04 KiB [emitted] [immutable] [minimized] (name: main) 1 related asset
asset 9ae91119845b89b379f6.js 3.55 KiB [emitted] [immutable] [minimized] 1 related asset
chunk (runtime: main) 9ae91119845b89b379f6.js 7.83 KiB [rendered]
  > react-dom ./example.js 2:0-22
  dependent modules 6.5 KiB [dependent] 1 module
  ../../node_modules/react-dom/index.js 1.33 KiB [built] [code generated]
chunk (runtime: main) 68dab3066399275cfe8c.js (main) 16.9 KiB (javascript) 4.94 KiB (runtime) [entry] [rendered]
  > ./example main
  runtime modules 4.94 KiB 6 modules
  dependent modules 16.9 KiB [dependent] 2 modules
  ./example.js 42 bytes [built] [code generated]
webpack X.X.X compiled successfully
```

## Records

```
{
  "aggressiveSplits": [],
  "chunks": {
    "byName": {
      "main": 0
    },
    "bySource": {
      "0 ./example.js react-dom": 1,
      "0 main": 0
    },
    "usedIds": [
      0,
      1
    ]
  },
  "modules": {
    "byIdentifier": {
      "../../node_modules/react-dom/cjs/react-dom.production.js": 4,
      "../../node_modules/react-dom/index.js": 3,
      "../../node_modules/react/cjs/react.production.js": 2,
      "../../node_modules/react/index.js": 1,
      "./example.js": 0
    },
    "usedIds": [
      0,
      1,
      2,
      3,
      4
    ]
  }
}
```
