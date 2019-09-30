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
Version: webpack 4.39.0
                  Asset       Size  Chunks             Chunk Names
0880c00cc5a4aa58c8f1.js  755 bytes       3  [emitted]  
3d11d709e1dd8377b73a.js   6.91 KiB       1  [emitted]  
6528b722fc8c6f112840.js    106 KiB       2  [emitted]  
9eb2d3f6ade09b3d55fe.js   18.2 KiB       0  [emitted]  main
Entrypoint main = 9eb2d3f6ade09b3d55fe.js
chunk    {0} 9eb2d3f6ade09b3d55fe.js (main) 8.96 KiB >{1}< >{2}< >{3}< [entry] [rendered]
    > ./example main
 [0] ./example.js 42 bytes {0} [built]
     + 3 hidden modules
chunk    {1} 3d11d709e1dd8377b73a.js 6.41 KiB <{0}> ={2}= ={3}= [rendered]
    > react-dom [0] ./example.js 2:0-22
    3 modules
chunk    {2} 6528b722fc8c6f112840.js 106 KiB <{0}> ={1}= ={3}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    1 module
chunk    {3} 0880c00cc5a4aa58c8f1.js 472 bytes <{0}> ={1}= ={2}= [rendered] [recorded] aggressive splitted
    > react-dom [0] ./example.js 2:0-22
 [8] (webpack)/buildin/global.js 472 bytes {3} [built]
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
                  Asset       Size  Chunks             Chunk Names
001ee3de6e1928c924e5.js   5.08 KiB       1  [emitted]  
31cdf743753cc7c06844.js  207 bytes       2  [emitted]  
c5d24deda21d05162ca8.js    104 KiB       3  [emitted]  
e7b462126f5b73af7427.js   9.73 KiB       0  [emitted]  main
Entrypoint main = e7b462126f5b73af7427.js
chunk    {0} e7b462126f5b73af7427.js (main) 8.96 KiB >{1}< >{2}< >{3}< [entry] [rendered]
    > ./example main
 [2] ./example.js 42 bytes {0} [built]
     + 3 hidden modules
chunk    {1} 001ee3de6e1928c924e5.js 6.41 KiB <{0}> ={2}= ={3}= [rendered]
    > react-dom [2] ./example.js 2:0-22
    3 modules
chunk    {2} 31cdf743753cc7c06844.js 472 bytes <{0}> ={1}= ={3}= [rendered] [recorded] aggressive splitted
    > react-dom [2] ./example.js 2:0-22
 [8] (webpack)/buildin/global.js 472 bytes {2} [built]
chunk    {3} c5d24deda21d05162ca8.js 106 KiB <{0}> ={1}= ={2}= [rendered] split chunk (cache group: vendors)
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
      "../../node_modules/scheduler/cjs/scheduler.production.min.js": 7,
      "../../buildin/global.js": 8
    },
    "usedIds": {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8
    }
  },
  "chunks": {
    "byName": {
      "main": 0
    },
    "bySource": {
      "2 example.js react-dom": 1,
      "0 example.js react-dom": 2,
      "1 example.js react-dom": 3
    },
    "usedIds": [
      0,
      1,
      2,
      3
    ]
  },
  "aggressiveSplits": [
    {
      "modules": [
        "../../buildin/global.js",
        "../../node_modules/react-dom/cjs/react-dom.production.min.js"
      ],
      "size": 108641,
      "hash": "0880c00cc5a4aa58c8f164d5b18e50e0",
      "id": 3
    }
  ]
}
```
