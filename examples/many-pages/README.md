# Info

This example illustrates webpack's algorithm for automatic deduplication using `optimization.splitChunks`.

This example application contains 7 pages, each of them importing 1-3 modules from the `node_modules` folder (vendor libs) and 0-3 modules from the `stuff` folder (application modules). In reallity an application is probably more complex, but the same mechanisms apply.

The following configuration is used:

- `optimization.splitChunks.chunks: "all"` - This opt-in into automatic splitting of initial chunks which is off by default
- `optimization.splitChunks.maxInitial/AsyncRequests: 20` - This opt-in into a HTTP2 optimized splitting mode by increasing the allowed amount of requests. Browser only supports 6 requests in parallel for HTTP1.1.

# Interpreting the result

- `pageA.js` the normal output files for the entrypoint `pageA`
- `vendors~pageD~pageE~pageF~pageG.js` vendor libs shared by these pages extracted into a separate output file when larger then the threshold in size
- `vendors~pageA.js` vendors only used by a single page but larger than the threshold in size
- `pageA~pageD~pageF.js` application modules shared by these pages and larger than the threshold in size

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
Version: webpack 5.0.0-alpha.18
   Asset       Size  Chunks             Chunk Names
  115.js  180 bytes   {115}  [emitted]
  402.js  121 bytes   {402}  [emitted]
  497.js  121 bytes   {497}  [emitted]
  505.js  156 bytes   {505}  [emitted]
  730.js  121 bytes   {730}  [emitted]
  777.js  121 bytes   {777}  [emitted]
  833.js  180 bytes   {833}  [emitted]
pageA.js   1.39 KiB   {424}  [emitted]  pageA
pageB.js   1.47 KiB   {121}  [emitted]  pageB
pageC.js   1.47 KiB   {178}  [emitted]  pageC
pageD.js   1.39 KiB   {568}  [emitted]  pageD
pageE.js   1.37 KiB   {356}  [emitted]  pageE
pageF.js   1.39 KiB   {789}  [emitted]  pageF
pageG.js   1.35 KiB   {547}  [emitted]  pageG
Entrypoint pageA = 115.js 730.js 505.js pageA.js
Entrypoint pageB = 115.js 497.js pageB.js
Entrypoint pageC = 115.js 402.js pageC.js
Entrypoint pageD = 777.js 833.js 505.js pageD.js
Entrypoint pageE = 777.js 833.js pageE.js
Entrypoint pageF = 777.js 833.js 505.js pageF.js
Entrypoint pageG = 777.js pageG.js
chunk {115} 115.js 86 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/a pageA
    > ./pages/b pageB
    > ./pages/c pageC
 [394] ./node_modules/m1.js 43 bytes {115} [built]
 [947] ./node_modules/m2.js 43 bytes {115} [built]
chunk {121} pageB.js (pageB) 199 bytes (javascript) 3.2 KiB (runtime) [entry] [rendered]
    > ./pages/b pageB
   [8] ./pages/b.js 106 bytes {121} [built]
 [175] ./stuff/s8.js 31 bytes {121} [built]
 [354] ./stuff/s1.js 31 bytes {121} {547} {568} {789} [built]
 [707] ./stuff/s7.js 31 bytes {121} {356} [built]
     + 4 hidden chunk modules
chunk {178} pageC.js (pageC) 199 bytes (javascript) 3.21 KiB (runtime) [entry] [rendered]
    > ./pages/c pageC
  [33] ./stuff/s4.js 31 bytes {178} {424} [built]
 [178] ./stuff/s5.js 31 bytes {178} [built]
 [324] ./pages/c.js 106 bytes {178} [built]
 [377] ./stuff/s6.js 31 bytes {178} [built]
     + 4 hidden chunk modules
chunk {356} pageE.js (pageE) 93 bytes (javascript) 3.21 KiB (runtime) [entry] [rendered]
    > ./pages/e pageE
 [238] ./pages/e.js 62 bytes {356} [built]
 [707] ./stuff/s7.js 31 bytes {121} {356} [built]
     + 4 hidden chunk modules
chunk {402} 402.js 43 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/c pageC
 [402] ./node_modules/m5.js 43 bytes {402} [built]
chunk {424} pageA.js (pageA) 137 bytes (javascript) 3.21 KiB (runtime) [entry] [rendered]
    > ./pages/a pageA
  [33] ./stuff/s4.js 31 bytes {178} {424} [built]
 [473] ./pages/a.js 106 bytes {424} [built]
     + 4 hidden chunk modules
chunk {497} 497.js 43 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/b pageB
 [497] ./node_modules/m4.js 43 bytes {497} [built]
chunk {505} 505.js 62 bytes [initial] [rendered] split chunk (cache group: default)
    > ./pages/a pageA
    > ./pages/d pageD
    > ./pages/f pageF
 [584] ./stuff/s3.js 31 bytes {505} [built]
 [742] ./stuff/s2.js 31 bytes {505} [built]
chunk {547} pageG.js (pageG) 67 bytes (javascript) 3.2 KiB (runtime) [entry] [rendered]
    > ./pages/g pageG
 [354] ./stuff/s1.js 31 bytes {121} {547} {568} {789} [built]
 [677] ./pages/g.js 36 bytes {547} [built]
     + 4 hidden chunk modules
chunk {568} pageD.js (pageD) 137 bytes (javascript) 3.21 KiB (runtime) [entry] [rendered]
    > ./pages/d pageD
 [354] ./stuff/s1.js 31 bytes {121} {547} {568} {789} [built]
 [901] ./pages/d.js 106 bytes {568} [built]
     + 4 hidden chunk modules
chunk {730} 730.js 43 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/a pageA
 [730] ./node_modules/m3.js 43 bytes {730} [built]
chunk {777} 777.js 43 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/d pageD
    > ./pages/e pageE
    > ./pages/f pageF
    > ./pages/g pageG
 [777] ./node_modules/m6.js 43 bytes {777} [built]
chunk {789} pageF.js (pageF) 137 bytes (javascript) 3.21 KiB (runtime) [entry] [rendered]
    > ./pages/f pageF
 [247] ./pages/f.js 106 bytes {789} [built]
 [354] ./stuff/s1.js 31 bytes {121} {547} {568} {789} [built]
     + 4 hidden chunk modules
chunk {833} 833.js 86 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/d pageD
    > ./pages/e pageE
    > ./pages/f pageF
 [502] ./node_modules/m7.js 43 bytes {833} [built]
 [848] ./node_modules/m8.js 43 bytes {833} [built]
```
