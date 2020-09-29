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
var path = require("path");
var webpack = require("../../");
module.exports = {
	// mode: "development || "production",
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
asset 47ea1b166a82a1b5f43d.js 118 KiB [emitted] [immutable] (id hint: vendors)
asset 532c4ecc9904099f20f1.js 25.7 KiB [emitted] [immutable] (name: main)
asset 5526ff367fe4665c9c7e.js 15.5 KiB [emitted] [immutable]
chunk 532c4ecc9904099f20f1.js (main) 8.8 KiB (javascript) 4.89 KiB (runtime) [entry] [rendered]
  > ./example main
  runtime modules 4.89 KiB 6 modules
  dependent modules 8.76 KiB [dependent] 3 modules
  ./example.js 42 bytes [built] [code generated]
chunk 5526ff367fe4665c9c7e.js 6.45 KiB [rendered]
  > react-dom ./example.js 2:0-22
  dependent modules 4.92 KiB [dependent] 1 module
  ../../node_modules/react-dom/index.js 1.33 KiB [built] [code generated]
  ../../node_modules/scheduler/index.js 198 bytes [built] [code generated]
chunk 47ea1b166a82a1b5f43d.js (id hint: vendors) 116 KiB [rendered] [recorded] aggressive splitted, reused as split chunk (cache group: defaultVendors)
  > react-dom ./example.js 2:0-22
  ../../node_modules/react-dom/cjs/react-dom.production.min.js 116 KiB [built] [code generated]
webpack 5.0.0-beta.32 compiled successfully
```

## Production mode

```
asset 72aa363ce76bb633931d.js 114 KiB [emitted] [immutable] [minimized] (id hint: vendors) 1 related asset
asset 38dc5da5a9157d296707.js 8.78 KiB [emitted] [immutable] [minimized] (name: main) 1 related asset
asset b0b6aefd6d463ae1bef1.js 4.92 KiB [emitted] [immutable] [minimized] 1 related asset
chunk (runtime: main) 38dc5da5a9157d296707.js (main) 8.8 KiB (javascript) 4.9 KiB (runtime) [entry] [rendered]
  > ./example main
  runtime modules 4.9 KiB 6 modules
  dependent modules 8.76 KiB [dependent] 3 modules
  ./example.js 42 bytes [built] [code generated]
chunk (runtime: main) b0b6aefd6d463ae1bef1.js 6.45 KiB [rendered]
  > react-dom ./example.js 2:0-22
  dependent modules 4.92 KiB [dependent] 1 module
  ../../node_modules/react-dom/index.js 1.33 KiB [built] [code generated]
  ../../node_modules/scheduler/index.js 198 bytes [built] [code generated]
chunk (runtime: main) 72aa363ce76bb633931d.js (id hint: vendors) 116 KiB [rendered] [recorded] aggressive splitted, reused as split chunk (cache group: defaultVendors)
  > react-dom ./example.js 2:0-22
  ../../node_modules/react-dom/cjs/react-dom.production.min.js 116 KiB [built] [code generated]
webpack 5.0.0-beta.32 compiled successfully
```

## Records

```
{
  "aggressiveSplits": [
    {
      "hash": "47ea1b166a82a1b5f43d12447a1b119e",
      "id": 2,
      "modules": [
        "../../node_modules/react-dom/cjs/react-dom.production.min.js"
      ],
      "size": 118737
    }
  ],
  "chunks": {
    "byName": {
      "main": 0
    },
    "bySource": {
      "0 ./example.js react-dom": 2,
      "0 main": 0,
      "1 ./example.js react-dom": 1
    },
    "usedIds": [
      0,
      1,
      2
    ]
  },
  "modules": {
    "byIdentifier": {
      "../../node_modules/object-assign/index.js": 3,
      "../../node_modules/react-dom/cjs/react-dom.production.min.js": 5,
      "../../node_modules/react-dom/index.js": 4,
      "../../node_modules/react/cjs/react.production.min.js": 2,
      "../../node_modules/react/index.js": 1,
      "../../node_modules/scheduler/cjs/scheduler.production.min.js": 7,
      "../../node_modules/scheduler/index.js": 6,
      "./example.js": 0
    },
    "usedIds": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7
    ]
  }
}
```
