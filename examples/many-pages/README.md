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
    1.js  116 bytes     {1}  [emitted]
  109.js  121 bytes   {109}  [emitted]
  177.js  121 bytes   {177}  [emitted]
  261.js  156 bytes   {261}  [emitted]
  589.js  180 bytes   {589}  [emitted]
  650.js  179 bytes   {650}  [emitted]
  792.js  121 bytes   {792}  [emitted]
pageA.js   1.35 KiB   {641}  [emitted]  pageA
pageB.js   1.43 KiB   {791}  [emitted]  pageB
pageC.js   1.43 KiB    {42}  [emitted]  pageC
pageD.js   1.34 KiB   {728}  [emitted]  pageD
pageE.js   1.32 KiB   {238}  [emitted]  pageE
pageF.js   1.34 KiB   {636}  [emitted]  pageF
pageG.js   1.31 KiB   {829}  [emitted]  pageG
Entrypoint pageA = 589.js 792.js 261.js pageA.js
Entrypoint pageB = 589.js 109.js pageB.js
Entrypoint pageC = 589.js 177.js pageC.js
Entrypoint pageD = 1.js 650.js 261.js pageD.js
Entrypoint pageE = 1.js 650.js pageE.js
Entrypoint pageF = 1.js 650.js 261.js pageF.js
Entrypoint pageG = 1.js pageG.js
chunk {1} 1.js 43 bytes ={238}= ={261}= ={636}= ={650}= ={728}= ={829}= [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/d pageD
    > ./pages/e pageE
    > ./pages/f pageF
    > ./pages/g pageG
 [1] ./node_modules/m6.js 43 bytes {1} [built]
chunk {42} pageC.js (pageC) 199 bytes (javascript) 3.12 KiB (runtime) ={177}= ={589}= [entry] [rendered]
    > ./pages/c pageC
 [161] ./pages/c.js 106 bytes {42} [built]
 [319] ./stuff/s6.js 31 bytes {42} [built]
 [439] ./stuff/s5.js 31 bytes {42} [built]
 [925] ./stuff/s4.js 31 bytes {42} {641} [built]
     + 4 hidden chunk modules
chunk {109} 109.js 43 bytes ={589}= ={791}= [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/b pageB
 [109] ./node_modules/m4.js 43 bytes {109} [built]
chunk {177} 177.js 43 bytes ={42}= ={589}= [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/c pageC
 [177] ./node_modules/m5.js 43 bytes {177} [built]
chunk {238} pageE.js (pageE) 93 bytes (javascript) 3.12 KiB (runtime) ={1}= ={650}= [entry] [rendered]
    > ./pages/e pageE
 [183] ./stuff/s7.js 31 bytes {238} {791} [built]
 [960] ./pages/e.js 62 bytes {238} [built]
     + 4 hidden chunk modules
chunk {261} 261.js 62 bytes ={1}= ={589}= ={636}= ={641}= ={650}= ={728}= ={792}= [initial] [rendered] split chunk (cache group: default)
    > ./pages/a pageA
    > ./pages/d pageD
    > ./pages/f pageF
 [213] ./stuff/s3.js 31 bytes {261} [built]
 [856] ./stuff/s2.js 31 bytes {261} [built]
chunk {589} 589.js 86 bytes ={42}= ={109}= ={177}= ={261}= ={641}= ={791}= ={792}= [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/a pageA
    > ./pages/b pageB
    > ./pages/c pageC
 [594] ./node_modules/m1.js 43 bytes {589} [built]
 [641] ./node_modules/m2.js 43 bytes {589} [built]
chunk {636} pageF.js (pageF) 137 bytes (javascript) 3.13 KiB (runtime) ={1}= ={261}= ={650}= [entry] [rendered]
    > ./pages/f pageF
 [942] ./pages/f.js 106 bytes {636} [built]
 [952] ./stuff/s1.js 31 bytes {636} {728} {791} {829} [built]
     + 4 hidden chunk modules
chunk {641} pageA.js (pageA) 137 bytes (javascript) 3.13 KiB (runtime) ={261}= ={589}= ={792}= [entry] [rendered]
    > ./pages/a pageA
 [303] ./pages/a.js 106 bytes {641} [built]
 [925] ./stuff/s4.js 31 bytes {42} {641} [built]
     + 4 hidden chunk modules
chunk {650} 650.js 86 bytes ={1}= ={238}= ={261}= ={636}= ={728}= [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/d pageD
    > ./pages/e pageE
    > ./pages/f pageF
  [15] ./node_modules/m8.js 43 bytes {650} [built]
 [690] ./node_modules/m7.js 43 bytes {650} [built]
chunk {728} pageD.js (pageD) 137 bytes (javascript) 3.13 KiB (runtime) ={1}= ={261}= ={650}= [entry] [rendered]
    > ./pages/d pageD
 [148] ./pages/d.js 106 bytes {728} [built]
 [952] ./stuff/s1.js 31 bytes {636} {728} {791} {829} [built]
     + 4 hidden chunk modules
chunk {791} pageB.js (pageB) 199 bytes (javascript) 3.12 KiB (runtime) ={109}= ={589}= [entry] [rendered]
    > ./pages/b pageB
 [183] ./stuff/s7.js 31 bytes {238} {791} [built]
 [772] ./stuff/s8.js 31 bytes {791} [built]
 [952] ./stuff/s1.js 31 bytes {636} {728} {791} {829} [built]
 [989] ./pages/b.js 106 bytes {791} [built]
     + 4 hidden chunk modules
chunk {792} 792.js 43 bytes ={261}= ={589}= ={641}= [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/a pageA
 [792] ./node_modules/m3.js 43 bytes {792} [built]
chunk {829} pageG.js (pageG) 67 bytes (javascript) 3.12 KiB (runtime) ={1}= [entry] [rendered]
    > ./pages/g pageG
 [292] ./pages/g.js 36 bytes {829} [built]
 [952] ./stuff/s1.js 31 bytes {636} {728} {791} {829} [built]
     + 4 hidden chunk modules
```