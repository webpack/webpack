# Info

This example illustrates webpack's algorithm for automatic deduplication using `optimization.splitChunks`.

This example application contains 7 pages, each of them importing 1-3 modules from the `node_modules` folder (vendor libs) and 0-3 modules from the `stuff` folder (application modules). In reallity an application is probably more complex, but the same mechanisms apply.

The following configuration is used:

* `optimization.splitChunks.chunks: "all"` - This opt-in into automatic splitting of initial chunks which is off by default
* `optimization.splitChunks.maxInitial/AsyncRequests: 20` - This opt-in into a HTTP2 optimized splitting mode by increasing the allowed amount of requests. Browser only supports 6 requests in parallel for HTTP1.1.

# Interpreting the result

* `pageA.js` the normal output files for the entrypoint `pageA`
* `vendors~pageD~pageE~pageF~pageG.js` vendor libs shared by these pages extracted into a separate output file when larger then the threshold in size
* `vendors~pageA.js` vendors only used by a single page but larger than the threshold in size
* `pageA~pageD~pageF.js` application modules shared by these pages and larger than the threshold in size

The threshold is here 40 bytes, but by default (in a real application) 30kb.

Some modules are intentially duplicated, i. e. `./stuff/s4.js` is shared by `pageA` and `pageC`, but it's the only shared module so no separate output file is created because it would be smaller than the threshold. A separate request (which comes with an overhead and worsen gzipping) is not worth the extra bytes.

Note: decreasing `maxInitial/AsyncRequest` will increase duplication further to reduce the number of requests. Duplication doesn't affect initial page load, it only affects download size of navigations to other pages of the application.

## webpack.config.js

```
module.exports = {
	// mode: "development || "production",
	entry: {
		pageA: "./pages/a",
		pageB: "./pages/b",
		pageC: "./pages/c",
		pageD: "./pages/d",
		pageE: "./pages/e",
		pageF: "./pages/f",
		pageG: "./pages/g"
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			maxInitialRequests: 20, // for HTTP2
			maxAsyncRequests: 20, // for HTTP2
			minSize: 40 // for example only: chosen to match 2 modules
			// omit minSize in real use case to use the default of 30kb
		}
	}
};
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
                             Asset       Size  Chunks             Chunk Names
                          pageA.js   1.55 KiB       8  [emitted]  pageA
              pageA~pageD~pageF.js  156 bytes       2  [emitted]  pageA~pageD~pageF
                          pageB.js   1.65 KiB       4  [emitted]  pageB
                          pageC.js   1.65 KiB       9  [emitted]  pageC
                          pageD.js   1.55 KiB       5  [emitted]  pageD
                          pageE.js   1.54 KiB      10  [emitted]  pageE
                          pageF.js   1.55 KiB       6  [emitted]  pageF
                          pageG.js   1.53 KiB       7  [emitted]  pageG
                  vendors~pageA.js  122 bytes      11  [emitted]  vendors~pageA
      vendors~pageA~pageB~pageC.js  178 bytes       1  [emitted]  vendors~pageA~pageB~pageC
                  vendors~pageB.js  122 bytes      12  [emitted]  vendors~pageB
                  vendors~pageC.js  122 bytes      13  [emitted]  vendors~pageC
      vendors~pageD~pageE~pageF.js  180 bytes       3  [emitted]  vendors~pageD~pageE~pageF
vendors~pageD~pageE~pageF~pageG.js  119 bytes       0  [emitted]  vendors~pageD~pageE~pageF~pageG
Entrypoint pageA = vendors~pageA~pageB~pageC.js vendors~pageA.js pageA~pageD~pageF.js pageA.js
Entrypoint pageB = vendors~pageA~pageB~pageC.js vendors~pageB.js pageB.js
Entrypoint pageC = vendors~pageA~pageB~pageC.js vendors~pageC.js pageC.js
Entrypoint pageD = vendors~pageD~pageE~pageF~pageG.js vendors~pageD~pageE~pageF.js pageA~pageD~pageF.js pageD.js
Entrypoint pageE = vendors~pageD~pageE~pageF~pageG.js vendors~pageD~pageE~pageF.js pageE.js
Entrypoint pageF = vendors~pageD~pageE~pageF~pageG.js vendors~pageD~pageE~pageF.js pageA~pageD~pageF.js pageF.js
Entrypoint pageG = vendors~pageD~pageE~pageF~pageG.js pageG.js
chunk    {0} vendors~pageD~pageE~pageF~pageG.js (vendors~pageD~pageE~pageF~pageG) 43 bytes ={2}= ={3}= ={5}= ={6}= ={7}= ={10}= [initial] [rendered] split chunk (cache group: defaultVendors) (name: vendors~pageD~pageE~pageF~pageG)
    > ./pages/d pageD
    > ./pages/e pageE
    > ./pages/f pageF
    > ./pages/g pageG
    1 module
chunk    {1} vendors~pageA~pageB~pageC.js (vendors~pageA~pageB~pageC) 86 bytes ={2}= ={4}= ={8}= ={9}= ={11}= ={12}= ={13}= [initial] [rendered] split chunk (cache group: defaultVendors) (name: vendors~pageA~pageB~pageC)
    > ./pages/a pageA
    > ./pages/b pageB
    > ./pages/c pageC
    2 modules
chunk    {2} pageA~pageD~pageF.js (pageA~pageD~pageF) 62 bytes ={0}= ={1}= ={3}= ={5}= ={6}= ={8}= ={11}= [initial] [rendered] split chunk (cache group: default) (name: pageA~pageD~pageF)
    > ./pages/a pageA
    > ./pages/d pageD
    > ./pages/f pageF
 [4] ./stuff/s2.js 31 bytes {2} [built]
 [5] ./stuff/s3.js 31 bytes {2} [built]
chunk    {3} vendors~pageD~pageE~pageF.js (vendors~pageD~pageE~pageF) 86 bytes ={0}= ={2}= ={5}= ={6}= ={10}= [initial] [rendered] split chunk (cache group: defaultVendors) (name: vendors~pageD~pageE~pageF)
    > ./pages/d pageD
    > ./pages/e pageE
    > ./pages/f pageF
    2 modules
chunk    {4} pageB.js (pageB) 206 bytes ={1}= ={12}= [entry] [rendered]
    > ./pages/b pageB
  [0] ./stuff/s1.js 31 bytes {4} {5} {6} {7} [built]
  [7] ./stuff/s7.js 31 bytes {4} {10} [built]
 [12] ./pages/b.js 113 bytes {4} [built]
 [14] ./stuff/s8.js 31 bytes {4} [built]
chunk    {5} pageD.js (pageD) 144 bytes ={0}= ={2}= ={3}= [entry] [rendered]
    > ./pages/d pageD
  [0] ./stuff/s1.js 31 bytes {4} {5} {6} {7} [built]
 [19] ./pages/d.js 113 bytes {5} [built]
chunk    {6} pageF.js (pageF) 144 bytes ={0}= ={2}= ={3}= [entry] [rendered]
    > ./pages/f pageF
  [0] ./stuff/s1.js 31 bytes {4} {5} {6} {7} [built]
 [21] ./pages/f.js 113 bytes {6} [built]
chunk    {7} pageG.js (pageG) 70 bytes ={0}= [entry] [rendered]
    > ./pages/g pageG
  [0] ./stuff/s1.js 31 bytes {4} {5} {6} {7} [built]
 [22] ./pages/g.js 39 bytes {7} [built]
chunk    {8} pageA.js (pageA) 144 bytes ={1}= ={2}= ={11}= [entry] [rendered]
    > ./pages/a pageA
  [6] ./stuff/s4.js 31 bytes {8} {9} [built]
 [10] ./pages/a.js 113 bytes {8} [built]
chunk    {9} pageC.js (pageC) 206 bytes ={1}= ={13}= [entry] [rendered]
    > ./pages/c pageC
  [6] ./stuff/s4.js 31 bytes {8} {9} [built]
 [15] ./pages/c.js 113 bytes {9} [built]
 [17] ./stuff/s5.js 31 bytes {9} [built]
 [18] ./stuff/s6.js 31 bytes {9} [built]
chunk   {10} pageE.js (pageE) 98 bytes ={0}= ={3}= [entry] [rendered]
    > ./pages/e pageE
  [7] ./stuff/s7.js 31 bytes {4} {10} [built]
 [20] ./pages/e.js 67 bytes {10} [built]
chunk   {11} vendors~pageA.js (vendors~pageA) 43 bytes ={1}= ={2}= ={8}= [initial] [rendered] split chunk (cache group: defaultVendors) (name: vendors~pageA)
    > ./pages/a pageA
    1 module
chunk   {12} vendors~pageB.js (vendors~pageB) 43 bytes ={1}= ={4}= [initial] [rendered] split chunk (cache group: defaultVendors) (name: vendors~pageB)
    > ./pages/b pageB
    1 module
chunk   {13} vendors~pageC.js (vendors~pageC) 43 bytes ={1}= ={9}= [initial] [rendered] split chunk (cache group: defaultVendors) (name: vendors~pageC)
    > ./pages/c pageC
    1 module
```