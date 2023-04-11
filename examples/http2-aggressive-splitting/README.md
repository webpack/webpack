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
asset 4fb93bdcf707906b4096.js 130 KiB [emitted] [immutable] (id hint: vendors)
asset 946bfb099aeb10733813.js 25.5 KiB [emitted] [immutable] (name: main)
asset fc12108f1066403ead6b.js 14.6 KiB [emitted] [immutable]
chunk (runtime: main) 946bfb099aeb10733813.js (main) 6.98 KiB (javascript) 5.02 KiB (runtime) [entry] [rendered]
  > ./example main
  runtime modules 5.02 KiB 6 modules
  dependent modules 6.94 KiB [dependent] 2 modules
  ./example.js 42 bytes [built] [code generated]
chunk (runtime: main) fc12108f1066403ead6b.js 5.66 KiB [rendered]
  > react-dom ./example.js 2:0-22
  dependent modules 4.14 KiB [dependent] 1 module
  ../../node_modules/react-dom/index.js 1.33 KiB [built] [code generated]
  ../../node_modules/scheduler/index.js 198 bytes [built] [code generated]
chunk (runtime: main) 4fb93bdcf707906b4096.js (id hint: vendors) 129 KiB [rendered] [recorded] aggressive splitted, reused as split chunk (cache group: defaultVendors)
  > react-dom ./example.js 2:0-22
  ../../node_modules/react-dom/cjs/react-dom.production.min.js 129 KiB [built] [code generated]
webpack 5.78.0 compiled successfully
```

## Production mode

```
asset 8d87087aa75c47be9b05.js 126 KiB [emitted] [immutable] [minimized] (id hint: vendors) 1 related asset
asset 9d09362c80c0b4708c7a.js 8.14 KiB [emitted] [immutable] [minimized] (name: main) 1 related asset
asset b9e0b2d00d17329af7b7.js 4.12 KiB [emitted] [immutable] [minimized] 1 related asset
chunk (runtime: main) 9d09362c80c0b4708c7a.js (main) 6.98 KiB (javascript) 5.02 KiB (runtime) [entry] [rendered]
  > ./example main
  runtime modules 5.02 KiB 6 modules
  dependent modules 6.94 KiB [dependent] 2 modules
  ./example.js 42 bytes [built] [code generated]
chunk (runtime: main) b9e0b2d00d17329af7b7.js 5.66 KiB [rendered]
  > react-dom ./example.js 2:0-22
  dependent modules 4.14 KiB [dependent] 1 module
  ../../node_modules/react-dom/index.js 1.33 KiB [built] [code generated]
  ../../node_modules/scheduler/index.js 198 bytes [built] [code generated]
chunk (runtime: main) 8d87087aa75c47be9b05.js (id hint: vendors) 129 KiB [rendered] [recorded] aggressive splitted, reused as split chunk (cache group: defaultVendors)
  > react-dom ./example.js 2:0-22
  ../../node_modules/react-dom/cjs/react-dom.production.min.js 129 KiB [built] [code generated]
webpack 5.78.0 compiled successfully
```

## Records

```
{
  "aggressiveSplits": [
    {
      "hash": "4fb93bdcf707906b4096f918339c66ef",
      "id": 2,
      "modules": [
        "../../node_modules/react-dom/cjs/react-dom.production.min.js"
      ],
      "size": 131737
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
      "../../node_modules/react-dom/cjs/react-dom.production.min.js": 4,
      "../../node_modules/react-dom/index.js": 3,
      "../../node_modules/react/cjs/react.production.min.js": 2,
      "../../node_modules/react/index.js": 1,
      "../../node_modules/scheduler/cjs/scheduler.production.min.js": 6,
      "../../node_modules/scheduler/index.js": 5,
      "./example.js": 0
    },
    "usedIds": [
      0,
      1,
      2,
      3,
      4,
      5,
      6
    ]
  }
}
```
