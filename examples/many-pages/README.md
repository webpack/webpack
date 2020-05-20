# Info

This example illustrates webpack's algorithm for automatic deduplication using `optimization.splitChunks`.

This example application contains 7 pages, each importing 1-3 modules from the `node_modules` folder (vendor libs) and 0-3 modules from the `stuff` folder (application modules). In reality, an application is probably more complex, but the same mechanisms apply.

The following configuration is used:

- `optimization.splitChunks.chunks: "all"` - This opt-in into automatic splitting of initial chunks which is off by default
- `optimization.splitChunks.maxInitial/AsyncRequests: 20` - This opt-in into an HTTP2 optimized splitting mode by increasing the allowed amount of requests. The browser only supports 6 requests in parallel for HTTP1.1.

# Interpreting the result

- `pageA.js` the normal output files for the entrypoint `pageA`
- `vendors~pageD~pageE~pageF~pageG.js` vendor libs shared by these pages extracted into a separate output file when larger than the threshold in size
- `vendors~pageA.js` vendors only used by a single page but larger than the threshold in size
- `pageA~pageD~pageF.js` application modules shared by these pages and larger than the threshold in size

Here, the threshold is 40 bytes but by default (in a real application) 30kb.

Some modules are intentionally duplicated, i. e. `./stuff/s4.js` is shared by `pageA` and `pageC`, but it's the only shared module so no separate output file is created because it would be smaller than the threshold. A separate request (which comes with an overhead and worsen gzipping) is not worth the extra bytes.

Note: decreasing `maxInitial/AsyncRequest` will increase duplication further to reduce the number of requests. Duplication doesn't affect the initial page load, it only affects download size of navigations to other pages of the application.

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
Version: webpack 5.0.0-beta.16
   Asset       Size
  115.js  168 bytes  [emitted]  [id hint: vendors]
  402.js  115 bytes  [emitted]  [id hint: vendors]
  497.js  115 bytes  [emitted]  [id hint: vendors]
  505.js  144 bytes  [emitted]
  730.js  115 bytes  [emitted]  [id hint: vendors]
  777.js  115 bytes  [emitted]  [id hint: vendors]
  833.js  168 bytes  [emitted]  [id hint: vendors]
pageA.js   1.09 KiB  [emitted]  [name: pageA]
pageB.js   1.16 KiB  [emitted]  [name: pageB]
pageC.js   1.17 KiB  [emitted]  [name: pageC]
pageD.js   1.09 KiB  [emitted]  [name: pageD]
pageE.js   1.07 KiB  [emitted]  [name: pageE]
pageF.js   1.09 KiB  [emitted]  [name: pageF]
pageG.js   1.06 KiB  [emitted]  [name: pageG]
Entrypoint pageA = 115.js 730.js 505.js pageA.js
Entrypoint pageB = 115.js 497.js pageB.js
Entrypoint pageC = 115.js 402.js pageC.js
Entrypoint pageD = 777.js 833.js 505.js pageD.js
Entrypoint pageE = 777.js 833.js pageE.js
Entrypoint pageF = 777.js 833.js 505.js pageF.js
Entrypoint pageG = 777.js pageG.js
chunk 115.js (id hint: vendors) 86 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/a pageA
    > ./pages/b pageB
    > ./pages/c pageC
 ./node_modules/m1.js 43 bytes [built]
 ./node_modules/m2.js 43 bytes [built]
chunk pageB.js (pageB) 199 bytes (javascript) 3.16 KiB (runtime) [entry] [rendered]
    > ./pages/b pageB
 ./pages/b.js 106 bytes [built]
 ./stuff/s1.js 31 bytes [built]
 ./stuff/s7.js 31 bytes [built]
 ./stuff/s8.js 31 bytes [built]
     + 4 hidden chunk modules
chunk pageC.js (pageC) 199 bytes (javascript) 3.16 KiB (runtime) [entry] [rendered]
    > ./pages/c pageC
 ./pages/c.js 106 bytes [built]
 ./stuff/s4.js 31 bytes [built]
 ./stuff/s5.js 31 bytes [built]
 ./stuff/s6.js 31 bytes [built]
     + 4 hidden chunk modules
chunk pageE.js (pageE) 93 bytes (javascript) 3.16 KiB (runtime) [entry] [rendered]
    > ./pages/e pageE
 ./pages/e.js 62 bytes [built]
 ./stuff/s7.js 31 bytes [built]
     + 4 hidden chunk modules
chunk 402.js (id hint: vendors) 43 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/c pageC
 ./node_modules/m5.js 43 bytes [built]
chunk pageA.js (pageA) 137 bytes (javascript) 3.17 KiB (runtime) [entry] [rendered]
    > ./pages/a pageA
 ./pages/a.js 106 bytes [built]
 ./stuff/s4.js 31 bytes [built]
     + 4 hidden chunk modules
chunk 497.js (id hint: vendors) 43 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/b pageB
 ./node_modules/m4.js 43 bytes [built]
chunk 505.js 62 bytes [initial] [rendered] split chunk (cache group: default)
    > ./pages/a pageA
    > ./pages/d pageD
    > ./pages/f pageF
 ./stuff/s2.js 31 bytes [built]
 ./stuff/s3.js 31 bytes [built]
chunk pageG.js (pageG) 67 bytes (javascript) 3.16 KiB (runtime) [entry] [rendered]
    > ./pages/g pageG
 ./pages/g.js 36 bytes [built]
 ./stuff/s1.js 31 bytes [built]
     + 4 hidden chunk modules
chunk pageD.js (pageD) 137 bytes (javascript) 3.17 KiB (runtime) [entry] [rendered]
    > ./pages/d pageD
 ./pages/d.js 106 bytes [built]
 ./stuff/s1.js 31 bytes [built]
     + 4 hidden chunk modules
chunk 730.js (id hint: vendors) 43 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/a pageA
 ./node_modules/m3.js 43 bytes [built]
chunk 777.js (id hint: vendors) 43 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/d pageD
    > ./pages/e pageE
    > ./pages/f pageF
    > ./pages/g pageG
 ./node_modules/m6.js 43 bytes [built]
chunk pageF.js (pageF) 137 bytes (javascript) 3.17 KiB (runtime) [entry] [rendered]
    > ./pages/f pageF
 ./pages/f.js 106 bytes [built]
 ./stuff/s1.js 31 bytes [built]
     + 4 hidden chunk modules
chunk 833.js (id hint: vendors) 86 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
    > ./pages/d pageD
    > ./pages/e pageE
    > ./pages/f pageF
 ./node_modules/m7.js 43 bytes [built]
 ./node_modules/m8.js 43 bytes [built]
```
