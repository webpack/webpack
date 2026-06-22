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
/******/ (() => {
/******/ 	// define getter/value functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		if(Array.isArray(definition)) {
/******/ 			var i = 0;
/******/ 			while(i < definition.length) {
/******/ 				var key = definition[i++];
/******/ 				var binding = definition[i++];
/******/ 				if(!__webpack_require__.o(exports, key)) {
/******/ 					if(binding === 0) {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, value: definition[i++] });
/******/ 					} else {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, get: binding });
/******/ 					}
/******/ 				} else if(binding === 0) { i++; }
/******/ 			}
/******/ 		} else {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/ensure chunk */
/******/ (() => {
/******/ 	__webpack_require__.f = {};
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = (chunkId) => {
/******/ 		return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 			__webpack_require__.f[key](chunkId, promises);
/******/ 			return promises;
/******/ 		}, []));
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/get javascript chunk filename */
/******/ (() => {
/******/ 	// This function allow to reference async chunks
/******/ 	__webpack_require__.u = (chunkId) => {
/******/ 		// return url for filenames based on template
/******/ 		return "" + chunkId + ".output.js";
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.hasOwn(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		if(Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/publicPath */
/******/ (() => {
/******/ 	__webpack_require__.p = "dist/";
/******/ })();
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
/******/ 			installedChunks[__webpack_esm_ids__[i]] = 0;
/******/ 		}
/******/ 	
/******/ 	}
/******/ 	
/******/ 	__webpack_require__.f.j = (chunkId, promises) => {
/******/ 			// import() chunk loading for javascript
/******/ 			let installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 			if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 	
/******/ 				// a Promise means "currently loading".
/******/ 				if(installedChunkData) {
/******/ 					promises.push(installedChunkData[1]);
/******/ 				} else {
/******/ 					if(true) { // all chunks have JS
/******/ 						// setup Promise in chunk cache
/******/ 						let promise = import(__webpack_require__.p + __webpack_require__.u(chunkId)).then(installChunk, (e) => {
/******/ 							if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined;
/******/ 							throw e;
/******/ 						});
/******/ 						promise = Promise.race([promise, new Promise((resolve) => (installedChunkData = installedChunks[chunkId] = [resolve]))])
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
	(await __webpack_require__.e(/*! import() */ 1).then(__webpack_require__.bind(__webpack_require__, /*! ./counter */ 1))).reset();
};

const print = value => console.log(value);

;// ./example.js


setTimeout(async () => {
	const counter = await __webpack_require__.e(/*! import() */ 1).then(__webpack_require__.bind(__webpack_require__, /*! ./counter */ 1));
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
var e={};const t={};function r(o){const n=t[o];if(void 0!==n)return n.exports;const i=t[o]={exports:{}};return e[o](i,i.exports,r),i.exports}r.m=e,r.d=(e,t)=>{if(Array.isArray(t))for(var o=0;o<t.length;){var n=t[o++],i=t[o++];r.o(e,n)?0===i&&o++:0===i?Object.defineProperty(e,n,{enumerable:!0,value:t[o++]}):Object.defineProperty(e,n,{enumerable:!0,get:i})}else for(var n in t)r.o(t,n)&&!r.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:t[n]})},r.f={},r.e=e=>Promise.all(Object.keys(r.f).reduce((t,o)=>(r.f[o](e,t),t),[])),r.u=e=>e+".output.js",r.o=(e,t)=>Object.hasOwn(e,t),r.r=e=>{Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.p="dist/",(()=>{const e={792:0},t=t=>{let{__webpack_esm_ids__:o,__webpack_esm_modules__:n,__webpack_esm_runtime__:i}=t;var s,a,c=0;for(s in n)r.o(n,s)&&(r.m[s]=n[s]);for(i&&i(r);c<o.length;c++)a=o[c],r.o(e,a)&&e[a]&&e[a][0](),e[o[c]]=0};r.f.j=(o,n)=>{let i=r.o(e,o)?e[o]:void 0;if(0!==i)if(i)n.push(i[1]);else{let s=import(r.p+r.u(o)).then(t,t=>{throw 0!==e[o]&&(e[o]=void 0),t});s=Promise.race([s,new Promise(t=>i=e[o]=[t])]),n.push(i[1]=s)}}})();const o=e=>console.log(e);setTimeout(async()=>{const e=await r.e(481).then(r.bind(r,481));o(e.value),e.increment(),e.increment(),e.increment(),o(e.value),await(async()=>{(await r.e(481).then(r.bind(r,481))).reset()})(),o(e.value)},100);
```

# Info

## Unoptimized

```
asset output.js 7.23 KiB [emitted] [javascript module] (name: main)
asset 1.output.js 1.34 KiB [emitted] [javascript module]
chunk (runtime: main) output.js (main) 420 bytes (javascript) 3.51 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 3.51 KiB 7 modules
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
asset output.js 1.37 KiB [emitted] [javascript module] [minimized] (name: main)
asset 481.output.js 258 bytes [emitted] [javascript module] [minimized]
chunk (runtime: main) 481.output.js 146 bytes [rendered]
  > ./counter ./methods.js 2:8-27
  > ./counter ./example.js 4:23-42
  ./counter.js 146 bytes [built] [code generated]
    [exports: decrement, increment, reset, value]
    import() ./counter ./example.js + 1 modules ./example.js 4:23-42
    import() ./counter ./example.js + 1 modules ./methods.js 2:8-27
chunk (runtime: main) output.js (main) 420 bytes (javascript) 3.51 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 3.51 KiB 7 modules
  ./example.js + 1 modules 420 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
    used as library export
webpack X.X.X compiled successfully
```
