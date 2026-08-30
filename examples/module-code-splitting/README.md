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
/******/ const __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	const cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	const module = __webpack_module_cache__[moduleId] = {
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
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ __webpack_require__.o = (obj, prop) => (Object.hasOwn(obj, prop));
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ // define __esModule on exports
/******/ __webpack_require__.r = (exports) => {
/******/ 	Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 	Object.defineProperty(exports, '__esModule', { value: true });
/******/ };
/******/ 
/******/ /* webpack/runtime/import chunk loading */
/******/ (() => {
/******/ 	// no baseURI
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// [resolve, Promise] = chunk loading, 0 = chunk loaded
/******/ 	const installedChunks = {
/******/ 		0: 0
/******/ 	};
/******/ 	
/******/ 	const installChunk = (data) => {
/******/ 		let {__webpack_esm_ids__, __webpack_esm_modules__, __webpack_esm_runtime__} = data;
/******/ 		// add "modules" to the modules object,
/******/ 		// then flag all "ids" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0;
/******/ 		for(moduleId in __webpack_esm_modules__) {
/******/ 			if(__webpack_require__.o(__webpack_esm_modules__, moduleId)) {
/******/ 				__webpack_require__.m[moduleId] = __webpack_esm_modules__[moduleId];
/******/ 			}
/******/ 		}
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
/******/ 	// no chunk on demand loading
/******/ 	
/******/ 	// no prefetching
/******/ 	
/******/ 	// no preloaded
/******/ 	
/******/ 	// no external install chunk
/******/ 	
/******/ 	__webpack_require__.ei = (chunkId, importFn) => {
/******/ 		let promises = [];
/******/ 		let installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 		if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 			// a Promise means "currently loading".
/******/ 			if(installedChunkData) {
/******/ 				promises.push(installedChunkData[1]);
/******/ 			} else {
/******/ 				let promise = importFn().then(installChunk, (e) => {
/******/ 					if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined;
/******/ 					throw e;
/******/ 				});
/******/ 				promise = Promise.race([promise, new Promise((resolve) => (installedChunkData = installedChunks[chunkId] = [resolve]))]);
/******/ 				promises.push((installedChunkData[1] = promise));
/******/ 			}
/******/ 		}
/******/ 		// no other chunk loading handlers
/******/ 		return Promise.all(promises);
/******/ 	};
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
/*! runtime requirements: __webpack_require__.ei, __webpack_require__ */

;// ./methods.js
const resetCounter = async () => {
	(await __webpack_require__.ei(1, () => (import(/*! import() */ "./dist/1.output.js"))).then(() => (__webpack_require__(/*! ./counter */ 1)))).reset();
};

const print = value => console.log(value);

;// ./example.js


setTimeout(async () => {
	const counter = await __webpack_require__.ei(1, () => (import(/*! import() */ "./dist/1.output.js"))).then(() => (__webpack_require__(/*! ./counter */ 1)));
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
var e={};const t={};function o(r){const n=t[r];if(void 0!==n)return n.exports;const i=t[r]={exports:{}};return e[r](i,i.exports,o),i.exports}o.m=e,o.d=(e,t)=>{for(var r in t)o.o(t,r)&&!o.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},o.o=(e,t)=>Object.hasOwn(e,t),o.r=e=>{Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},(()=>{const e={792:0},t=t=>{let{__webpack_esm_ids__:r,__webpack_esm_modules__:n,__webpack_esm_runtime__:i}=t;var s,a,c=0;for(s in n)o.o(n,s)&&(o.m[s]=n[s]);for(i&&i(o);c<r.length;c++)a=r[c],o.o(e,a)&&e[a]&&e[a][0](),e[a]=0};o.ei=(r,n)=>{let i=[],s=o.o(e,r)?e[r]:void 0;if(0!==s)if(s)i.push(s[1]);else{let o=n().then(t,t=>{throw 0!==e[r]&&(e[r]=void 0),t});o=Promise.race([o,new Promise(t=>s=e[r]=[t])]),i.push(s[1]=o)}return Promise.all(i)}})();const r=e=>console.log(e);setTimeout(async()=>{const e=await o.ei(481,()=>import("./dist/481.output.js")).then(()=>o(481));r(e.value),e.increment(),e.increment(),e.increment(),r(e.value),await(async()=>{(await o.ei(481,()=>import("./dist/481.output.js")).then(()=>o(481))).reset()})(),r(e.value)},100);
```

# Info

## Unoptimized

```
asset output.js 5.47 KiB [emitted] [javascript module] (name: main)
asset 1.output.js 1.3 KiB [emitted] [javascript module]
chunk (runtime: main) output.js (main) 420 bytes (javascript) 2.43 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 2.43 KiB 4 modules
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
asset output.js 1.12 KiB [emitted] [javascript module] [minimized] (name: main)
asset 481.output.js 222 bytes [emitted] [javascript module] [minimized]
chunk (runtime: main) 481.output.js 146 bytes [rendered]
  > ./counter ./methods.js 2:8-27
  > ./counter ./example.js 4:23-42
  ./counter.js 146 bytes [built] [code generated]
    [exports: decrement, increment, reset, value]
    import() ./counter ./example.js + 1 modules ./example.js 4:23-42
    import() ./counter ./example.js + 1 modules ./methods.js 2:8-27
chunk (runtime: main) output.js (main) 420 bytes (javascript) 2.43 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 2.43 KiB 4 modules
  ./example.js + 1 modules 420 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
    used as library export
webpack X.X.X compiled successfully
```
