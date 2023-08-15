# example.js

```javascript
async function main() {
	const pMap1 = await __non_webpack_import__("https://cdn.skypack.dev/p-map");
	const pMap2 = await __non_webpack_import__("https://cdn.esm.sh/p-map");
	const pMap3 = await __non_webpack_import__("https://jspm.dev/p-map");
	const pMap4 = await __non_webpack_import__("https://unpkg.com/p-map-series?module"); // unpkg doesn't support p-map :(
	console.log(pMap1);
	console.log(pMap2);
	console.log(pMap3);
	console.log(pMap4);
}

main()
```

# webpack.config.js

```javascript
module.exports = {};
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
async function main() {
	const pMap1 = await import("https://cdn.skypack.dev/p-map");
	const pMap2 = await import("https://cdn.esm.sh/p-map");
	const pMap3 = await import("https://jspm.dev/p-map");
	const pMap4 = await import("https://unpkg.com/p-map-series?module"); // unpkg doesn't support p-map :(
	console.log(pMap1);
	console.log(pMap2);
	console.log(pMap3);
	console.log(pMap4);
}

main()

/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 628 bytes [emitted] (name: main)
chunk (runtime: main) output.js (main) 460 bytes [entry] [rendered]
  > ./example.js main
  ./example.js 460 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack 5.88.2 compiled successfully
```

## Production mode

```
asset output.js 275 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 460 bytes [entry] [rendered]
  > ./example.js main
  ./example.js 460 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack 5.88.2 compiled successfully
```
