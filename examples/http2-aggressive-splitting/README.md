This example demonstrates the AggressiveSplittingPlugin for splitting the bundle into multiple smaller chunks to improve caching. This works best with a HTTP2 web server, otherwise there is an overhead for the increased number of requests.

AggressiveSplittingPlugin splits every chunk until it reaches the specified `maxSize`. In this example it tries to create chunks with <50kB raw code, which typically minimizes to ~10kB. It groups modules together by folder structure, because modules in the same folder are likely to have similar repetitive text, making them gzip efficiently together. They are also likely to change together.

AggressiveSplittingPlugin records its splitting in the webpack records. When it is next run, it tries to use the last recorded splitting. Since changes to application code between one run and the next are usually in only a few modules (or just one), re-using the old splittings (and chunks, which are probably still in the client's cache), is highly advantageous.

Only chunks which are bigger than the specified `minSize` are stored into the records. This ensures that these chunks fill up as your application grows, instead of creating many records of small chunks for every change.

If a module changes, its chunks are declared to be invalid, and are put back into the module pool. New chunks are created from all modules in the pool.

There is a tradeoff here:

The caching improves with smaller `maxSize`, as chunks change less often and can be reused more often after an update.

The compression improves with bigger `maxSize`, as gzip works better for bigger files. It's more likely to find duplicate strings, etc.

The backward compatibility (non HTTP2 client) improves with bigger `maxSize`, as the number of requests decreases.

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
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.2
                  Asset      Size  Chunks             Chunk Names
122da19e8d3efaa79a86.js  18.5 KiB       0  [emitted]  main
773bce95ae4a9199c7f1.js   112 KiB       2  [emitted]  
dbe211f2cb11df7e04fc.js  7.85 KiB       1  [emitted]  
Entrypoint main = 122da19e8d3efaa79a86.js
chunk    {0} 122da19e8d3efaa79a86.js (main) 8.94 KiB >{1}< >{2}< [entry] [rendered]
    > ./example main
 [0] ./example.js 42 bytes {0} [built]
     + 3 hidden modules
chunk    {1} dbe211f2cb11df7e04fc.js 7.2 KiB <{0}> ={2}= [rendered]
    > react-dom [0] ./example.js 2:0-22
    3 modules
chunk    {2} 773bce95ae4a9199c7f1.js 111 KiB <{0}> ={1}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    1 module
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.2
                  Asset      Size  Chunks             Chunk Names
360cbbc0fcf66258851b.js  5.78 KiB       1  [emitted]  
3b77c0a58aca529287e0.js   110 KiB       2  [emitted]  
7ba16a71c9cc971a7aae.js  9.71 KiB       0  [emitted]  main
Entrypoint main = 7ba16a71c9cc971a7aae.js
chunk    {0} 7ba16a71c9cc971a7aae.js (main) 8.94 KiB >{1}< >{2}< [entry] [rendered]
    > ./example main
 [2] ./example.js 42 bytes {0} [built]
     + 3 hidden modules
chunk    {1} 360cbbc0fcf66258851b.js 7.2 KiB <{0}> ={2}= [rendered]
    > react-dom [2] ./example.js 2:0-22
    3 modules
chunk    {2} 3b77c0a58aca529287e0.js 111 KiB <{0}> ={1}= [rendered] split chunk (cache group: vendors)
    > react-dom [2] ./example.js 2:0-22
    1 module
```

## Records

```
{
  "modules": {
    "byIdentifier": {
      "example.js": 0,
      "../../node_modules/react/index.js": 1,
      "../../node_modules/react/cjs/react.production.min.js": 2,
      "../../node_modules/object-assign/index.js": 3,
      "../../node_modules/react-dom/index.js": 4,
      "../../node_modules/react-dom/cjs/react-dom.production.min.js": 5,
      "../../node_modules/scheduler/index.js": 6,
      "../../node_modules/scheduler/cjs/scheduler.production.min.js": 7
    },
    "usedIds": {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7
    }
  },
  "chunks": {
    "byName": {
      "main": 0
    },
    "bySource": {
      "1 example.js react-dom": 1,
      "0 example.js react-dom": 2
    },
    "usedIds": [
      0,
      1,
      2
    ]
  },
  "aggressiveSplits": []
}
```
