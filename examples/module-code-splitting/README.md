# example.js

```javascript
import { resetCounter, print } from "./methods";

setTimeout(async () => {
	const counter = await import("./counter");
	print(counter.value);
	counter.increment();
	counter.increment();
	counter.increment();
	print(counter.value);
	await resetCounter();
	print(counter.value);
}, 100);
```

# methods.js

```javascript
export const resetCounter = async () => {
	(await import("./counter")).reset();
};

export const print = value => console.log(value);
```

# counter.js

```javascript
export let value = 0;
export function increment() {
	value++;
}
export function decrement() {
	value--;
}
export function reset() {
	value = 0;
}
```

# dist/output.js

```javascript
/******/ var __webpack_modules__ = ({});
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/******/ // expose the modules object (__webpack_modules__)
/******/ __webpack_require__.m = __webpack_modules__;
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ // define getter/value functions for harmony exports
/******/ __webpack_require__.d = (exports, definition) => {
/******/ 	for(var key in definition) {
/******/ 		if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 			Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 		}
/******/ 	}
/******/ };
/******/ 
/******/ /* webpack/runtime/ensure chunk */
/******/ __webpack_require__.f = {};
/******/ // This file contains only the entry chunk.
/******/ // The chunk loading function for additional chunks
/******/ __webpack_require__.e = (chunkId) => {
/******/ 	var promises = [];
/******/ 	__webpack_require__.f.j(chunkId, promises);
/******/ 	return Promise.all(promises);
/******/ };
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ __webpack_require__.o = (obj, prop) => (Object.hasOwn(obj, prop));
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ // define __esModule on exports
/******/ __webpack_require__.r = (exports) => (Object.defineProperties(exports, { [Symbol.toStringTag]: { value: 'Module' }, __esModule: { value: true } }));
/******/ 
/******/ /* webpack/runtime/import chunk loading */
/******/ (() => {
/******/ 	// no baseURI
/******/ 	
/******/ 	var chunkImports = {
/******/ 		"1": () => (import("./dist/1.output.js"))
/******/ 	};
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// [resolve, Promise] = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		0: 0
/******/ 	};
/******/ 	
/******/ 	var installChunk = (data) => {
/******/ 		let {__webpack_esm_ids__, __webpack_esm_modules__, __webpack_esm_runtime__} = data;
/******/ 		// add "modules" to the modules object,
/******/ 		// then flag all "ids" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0;
/******/ 		Object.assign(__webpack_require__.m, __webpack_esm_modules__);
/******/ 		if(__webpack_esm_runtime__) __webpack_esm_runtime__(__webpack_require__);
/******/ 		for(;i < __webpack_esm_ids__.length; i++) {
/******/ 			chunkId = __webpack_esm_ids__[i];
/******/ 			if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 				installedChunks[chunkId][0]();
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 	
/******/ 	}
/******/ 	
/******/ 	__webpack_require__.f.j = (chunkId, promises) => {
/******/ 			// import() chunk loading for javascript
/******/ 			var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 			if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 	
/******/ 				// a Promise means "currently loading".
/******/ 				if(installedChunkData) {
/******/ 					promises.push(installedChunkData[1]);
/******/ 				} else {
/******/ 					if(true) { // all chunks have JS
/******/ 						// setup Promise in chunk cache
/******/ 						var promise = Promise.race([chunkImports[chunkId]().then(installChunk, (e) => {
/******/ 							if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined;
/******/ 							throw e;
/******/ 						}), new Promise((resolve) => (installedChunkData = installedChunks[chunkId] = [resolve]))]);
/******/ 						promises.push(installedChunkData[1] = promise);
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 	};
/******/ 	
/******/ 	// no prefetching
/******/ 	
/******/ 	// no preloaded
/******/ 	
/******/ 	// no external install chunk
/******/ 	
/******/ 	// no on chunks loaded
/******/ 	// no HMR
/******/ 	
/******/ 	// no HMR manifest
/******/ })();
/******/ 
/************************************************************************/
```

</details>

``` js
/*!********************************!*\
  !*** ./example.js + 1 modules ***!
  \********************************/
/*! namespace exports */
/*! runtime requirements: __webpack_require__.e, __webpack_require__, __webpack_require__.* */

;// ./methods.js
const resetCounter = async () => {
	(await __webpack_require__.e(/*! import() */ 1).then(() => (__webpack_require__(/*! ./counter */ 1)))).reset();
};

const print = value => console.log(value);

;// ./example.js


setTimeout(async () => {
	const counter = await __webpack_require__.e(/*! import() */ 1).then(() => (__webpack_require__(/*! ./counter */ 1)));
	print(counter.value);
	counter.increment();
	counter.increment();
	counter.increment();
	print(counter.value);
	await resetCounter();
	print(counter.value);
}, 100);
```

# dist/output.js (production)

```javascript
var e,t,r,o={},a={};function n(e){var t=a[e];if(void 0!==t)return t.exports;var r=a[e]={exports:{}};return o[e](r,r.exports,n),r.exports}n.m=o,n.d=(e,t)=>{for(var r in t)n.o(t,r)&&!n.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},n.f={},n.e=e=>{var t=[];return n.f.j(e,t),Promise.all(t)},n.o=(e,t)=>Object.hasOwn(e,t),n.r=e=>Object.defineProperties(e,{[Symbol.toStringTag]:{value:"Module"},__esModule:{value:!0}}),e={481:()=>import("./dist/481.output.js")},t={792:0},r=e=>{let{__webpack_esm_ids__:r,__webpack_esm_modules__:o,__webpack_esm_runtime__:a}=e;var s,i=0;for(Object.assign(n.m,o),a&&a(n);i<r.length;i++)s=r[i],n.o(t,s)&&t[s]&&t[s][0](),t[s]=0},n.f.j=(o,a)=>{var s=n.o(t,o)?t[o]:void 0;if(0!==s)if(s)a.push(s[1]);else{var i=Promise.race([e[o]().then(r,e=>{throw 0!==t[o]&&(t[o]=void 0),e}),new Promise(e=>s=t[o]=[e])]);a.push(s[1]=i)}};const s=e=>console.log(e);setTimeout(async()=>{const e=await n.e(481).then(()=>n(481));s(e.value),e.increment(),e.increment(),e.increment(),s(e.value),await(async()=>{(await n.e(481).then(()=>n(481))).reset()})(),s(e.value)},100);
```

# Info

## Unoptimized

```
asset output.js 5.67 KiB [emitted] [javascript module] (name: main)
asset 1.output.js 1.29 KiB [emitted] [javascript module]
chunk (runtime: main) output.js (main) 420 bytes (javascript) 2.61 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 2.61 KiB 5 modules
  ./example.js + 1 modules 420 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
    used as library export
chunk (runtime: main) 1.output.js 146 bytes [rendered]
  > ./counter ./methods.js 2:8-27
  > ./counter ./example.js 4:23-42
  ./counter.js 146 bytes [built] [code generated]
    [exports: decrement, increment, reset, value]
    import() ./counter ./example.js + 1 modules ./example.js 4:23-42
    import() ./counter ./example.js + 1 modules ./methods.js 2:8-27
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 1.06 KiB [emitted] [javascript module] [minimized] (name: main)
asset 481.output.js 209 bytes [emitted] [javascript module] [minimized]
chunk (runtime: main) 481.output.js 146 bytes [rendered]
  > ./counter ./methods.js 2:8-27
  > ./counter ./example.js 4:23-42
  ./counter.js 146 bytes [built] [code generated]
    [exports: decrement, increment, reset, value]
    import() ./counter ./example.js + 1 modules ./example.js 4:23-42
    import() ./counter ./example.js + 1 modules ./methods.js 2:8-27
chunk (runtime: main) output.js (main) 420 bytes (javascript) 2.61 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 2.61 KiB 5 modules
  ./example.js + 1 modules 420 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
    used as library export
webpack X.X.X compiled successfully
```
