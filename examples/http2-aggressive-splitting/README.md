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
asset 434ca1986a0beff3ab0a.js 119 KiB [emitted] [immutable] (id hint: vendors)
asset 63e27c7ae33b270c75c3.js 25.7 KiB [emitted] [immutable] (name: main)
asset d5aec2d66108d090457d.js 15.3 KiB [emitted] [immutable]
chunk (runtime: main) 63e27c7ae33b270c75c3.js (main) 8.59 KiB (javascript) 5.04 KiB (runtime) [entry] [rendered]
  > ./example main
  runtime modules 5.04 KiB 6 modules
  dependent modules 8.54 KiB [dependent] 3 modules
  ./example.js 44 bytes [built] [code generated]
chunk (runtime: main) d5aec2d66108d090457d.js 6.24 KiB [rendered]
  > react-dom ./example.js 2:0-22
  dependent modules 4.72 KiB [dependent] 1 module
  ../../node_modules/react-dom/index.js 1.33 KiB [built] [code generated]
  ../../node_modules/scheduler/index.js 198 bytes [built] [code generated]
chunk (runtime: main) 434ca1986a0beff3ab0a.js (id hint: vendors) 118 KiB [rendered] [recorded] aggressive splitted, reused as split chunk (cache group: defaultVendors)
  > react-dom ./example.js 2:0-22
  ../../node_modules/react-dom/cjs/react-dom.production.min.js 118 KiB [built] [code generated]
webpack 5.20.0 compiled successfully
```

## Production mode

```
asset bdac966f1b2ecc84d1bb.js 115 KiB [emitted] [immutable] [minimized] (id hint: vendors) 1 related asset
asset d2d52f1c103952aa016d.js 8.6 KiB [emitted] [immutable] [minimized] (name: main) 1 related asset
asset b0ea9ff01e1f85c1bc28.js 4.71 KiB [emitted] [immutable] [minimized] 1 related asset
chunk (runtime: main) d2d52f1c103952aa016d.js (main) 8.59 KiB (javascript) 5.04 KiB (runtime) [entry] [rendered]
  > ./example main
  runtime modules 5.04 KiB 6 modules
  dependent modules 8.54 KiB [dependent] 3 modules
  ./example.js 44 bytes [built] [code generated]
chunk (runtime: main) b0ea9ff01e1f85c1bc28.js 6.24 KiB [rendered]
  > react-dom ./example.js 2:0-22
  dependent modules 4.72 KiB [dependent] 1 module
  ../../node_modules/react-dom/index.js 1.33 KiB [built] [code generated]
  ../../node_modules/scheduler/index.js 198 bytes [built] [code generated]
chunk (runtime: main) bdac966f1b2ecc84d1bb.js (id hint: vendors) 118 KiB [rendered] [recorded] aggressive splitted, reused as split chunk (cache group: defaultVendors)
  > react-dom ./example.js 2:0-22
  ../../node_modules/react-dom/cjs/react-dom.production.min.js 118 KiB [built] [code generated]
webpack 5.20.0 compiled successfully
```

## Records

```
{
  "aggressiveSplits": [
    {
      "hash": "434ca1986a0beff3ab0a606774f30fbf",
      "id": 2,
      "modules": [
        "../../node_modules/react-dom/cjs/react-dom.production.min.js"
      ],
      "size": 120688
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
