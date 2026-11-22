# example.js

```javascript
document.body.innerHTML = `
	<pre id="history"></pre>
	<form>
	<input id="message" type="text">
	<button id="send">Send Message</button>
	</form>
	<p>Computing fibonacci without worker:</p>
	<input id="fib1" type="number">
	<pre id="output1"></pre>
	<p>Computing fibonacci with worker:</p>
	<input id="fib2" type="number">
	<pre id="output2"></pre>
`;

const history = document.getElementById("history");
const message = document.getElementById("message");
const send = document.getElementById("send");
const fib1 = document.getElementById("fib1");
const output1 = document.getElementById("output1");
const fib2 = document.getElementById("fib2");
const output2 = document.getElementById("output2");

/// CHAT with shared worker ///

const chatWorker = new SharedWorker(
	new URL("./chat-worker.js", import.meta.url),
	{
		name: "chat",
		type: "module"
	}
);

let historyTimeout;
const scheduleUpdateHistory = () => {
	clearTimeout(historyTimeout);
	historyTimeout = setTimeout(() => {
		chatWorker.port.postMessage({ type: "history" });
	}, 1000);
};
scheduleUpdateHistory();

const from = `User ${Math.floor(Math.random() * 10000)}`;

send.addEventListener("click", e => {
	chatWorker.port.postMessage({
		type: "message",
		content: message.value,
		from
	});
	message.value = "";
	message.focus();
	e.preventDefault();
});

chatWorker.port.onmessage = event => {
	const msg = event.data;
	switch (msg.type) {
		case "history":
			history.innerText = msg.history.join("\n");
			scheduleUpdateHistory();
			break;
	}
};

/// FIBONACCI without worker ///

fib1.addEventListener("change", async () => {
	try {
		const value = parseInt(fib1.value, 10);
		const { fibonacci } = await import("./fibonacci");
		const result = fibonacci(value);
		output1.innerText = `fib(${value}) = ${result}`;
	} catch (e) {
		output1.innerText = e.message;
	}
});

/// FIBONACCI with worker ///

const fibWorker = new Worker(new URL("./fib-worker.js", import.meta.url), {
	name: "fibonacci",
	type: "module"
	/* webpackEntryOptions: { filename: "workers/[name].js" } */
});

fib2.addEventListener("change", () => {
	try {
		const value = parseInt(fib2.value, 10);
		fibWorker.postMessage(`${value}`);
	} catch (e) {
		output2.innerText = e.message;
	}
});

fibWorker.onmessage = event => {
	output2.innerText = event.data;
};
```

# fib-worker.js

```javascript
onmessage = async event => {
	const { fibonacci } = await import("./fibonacci");
	const value = JSON.parse(event.data);
	postMessage(`fib(${value}) = ${fibonacci(value)}`);
};
```

# fibonacci.js

```javascript
export function fibonacci(n) {
	return n < 1 ? 0 : n <= 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2);
}
```

# chat-worker.js

```javascript
onconnect = function (e) {
	for (const port of e.ports) {
		port.onmessage = async event => {
			const msg = event.data;
			switch (msg.type) {
				case "message":
					const { add } = await import("./chat-module");
					add(msg.content, msg.from);
				// fallthrough
				case "history":
					const { history } = await import("./chat-module");
					port.postMessage({
						type: "history",
						history
					});
					break;
			}
		};
	}
};
```

# chat-module.js

```javascript
export const history = [];

export const add = (content, from) => {
	if (history.length > 10) history.shift();
	history.push(`${from}: ${content}`);
};
```

# dist/main.js

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
/******/ 		"129": () => (import("/dist/129.js"))
/******/ 	};
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// [resolve, Promise] = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		792: 0
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
let __webpack_exports__ = {};
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__.e, __webpack_require__, __webpack_require__.* */
document.body.innerHTML = `
	<pre id="history"></pre>
	<form>
	<input id="message" type="text">
	<button id="send">Send Message</button>
	</form>
	<p>Computing fibonacci without worker:</p>
	<input id="fib1" type="number">
	<pre id="output1"></pre>
	<p>Computing fibonacci with worker:</p>
	<input id="fib2" type="number">
	<pre id="output2"></pre>
`;

const history = document.getElementById("history");
const message = document.getElementById("message");
const send = document.getElementById("send");
const fib1 = document.getElementById("fib1");
const output1 = document.getElementById("output1");
const fib2 = document.getElementById("fib2");
const output2 = document.getElementById("output2");

/// CHAT with shared worker ///

const chatWorker = new SharedWorker(
	new URL(/* worker import */ "/dist/chat.js", import.meta.url),
	{
		name: "chat",
		type: "module"
	}
);

let historyTimeout;
const scheduleUpdateHistory = () => {
	clearTimeout(historyTimeout);
	historyTimeout = setTimeout(() => {
		chatWorker.port.postMessage({ type: "history" });
	}, 1000);
};
scheduleUpdateHistory();

const from = `User ${Math.floor(Math.random() * 10000)}`;

send.addEventListener("click", e => {
	chatWorker.port.postMessage({
		type: "message",
		content: message.value,
		from
	});
	message.value = "";
	message.focus();
	e.preventDefault();
});

chatWorker.port.onmessage = event => {
	const msg = event.data;
	switch (msg.type) {
		case "history":
			history.innerText = msg.history.join("\n");
			scheduleUpdateHistory();
			break;
	}
};

/// FIBONACCI without worker ///

fib1.addEventListener("change", async () => {
	try {
		const value = parseInt(fib1.value, 10);
		const { fibonacci } = await __webpack_require__.e(/*! import() */ 129).then(() => (__webpack_require__(/*! ./fibonacci */ 3)));
		const result = fibonacci(value);
		output1.innerText = `fib(${value}) = ${result}`;
	} catch (e) {
		output1.innerText = e.message;
	}
});

/// FIBONACCI with worker ///

const fibWorker = new Worker(new URL(/* worker import */ "/dist/workers/fibonacci.js", import.meta.url), {
	name: "fibonacci",
	type: "module"
	/* webpackEntryOptions: { filename: "workers/[name].js" } */
});

fib2.addEventListener("change", () => {
	try {
		const value = parseInt(fib2.value, 10);
		fibWorker.postMessage(`${value}`);
	} catch (e) {
		output2.innerText = e.message;
	}
});

fibWorker.onmessage = event => {
	output2.innerText = event.data;
};
```

# dist/chat.js

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
/******/ 		"936": () => (import("/dist/936.js"))
/******/ 	};
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// [resolve, Promise] = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		377: 0
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
let __webpack_exports__ = {};
/*!************************!*\
  !*** ./chat-worker.js ***!
  \************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__.e, __webpack_require__, __webpack_require__.* */
onconnect = function (e) {
	for (const port of e.ports) {
		port.onmessage = async event => {
			const msg = event.data;
			switch (msg.type) {
				case "message":
					const { add } = await __webpack_require__.e(/*! import() */ 936).then(() => (__webpack_require__(/*! ./chat-module */ 4)));
					add(msg.content, msg.from);
				// fallthrough
				case "history":
					const { history } = await __webpack_require__.e(/*! import() */ 936).then(() => (__webpack_require__(/*! ./chat-module */ 4)));
					port.postMessage({
						type: "history",
						history
					});
					break;
			}
		};
	}
};
```

```javascript
var e,r,t,o={},s={};function a(e){var r=s[e];if(void 0!==r)return r.exports;var t=s[e]={exports:{}};return o[e](t,t.exports,a),t.exports}a.m=o,a.d=(e,r)=>{if(Array.isArray(r))for(var t=0;t<r.length;){var o=r[t++],s=r[t++],n={enumerable:!0,[s?"get":"value"]:s||r[t++]};a.o(e,o)||Object.defineProperty(e,o,n)}else for(var o in r)a.o(r,o)&&!a.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:r[o]})},a.f={},a.e=e=>{var r=[];return a.f.j(e,r),Promise.all(r)},a.o=(e,r)=>Object.hasOwn(e,r),e={936:()=>import("/dist/936.js")},r={377:0},t=e=>{let{__webpack_esm_ids__:t,__webpack_esm_modules__:o,__webpack_esm_runtime__:s}=e;var n,i=0;for(Object.assign(a.m,o),s&&s(a);i<t.length;i++)n=t[i],a.o(r,n)&&r[n]&&r[n][0](),r[n]=0},a.f.j=(o,s)=>{var n=a.o(r,o)?r[o]:void 0;if(0!==n)if(n)s.push(n[1]);else{var i=Promise.race([e[o]().then(t,e=>{throw 0!==r[o]&&(r[o]=void 0),e}),new Promise(e=>n=r[o]=[e])]);s.push(n[1]=i)}},onconnect=function(e){for(const r of e.ports)r.onmessage=async e=>{const t=e.data;switch(t.type){case"message":const{add:e}=await a.e(936).then(()=>a(936));e(t.content,t.from);case"history":const{history:o}=await a.e(936).then(()=>a(936));r.postMessage({type:"history",history:o})}}};
```

# dist/workers/fibonacci.js

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
/******/ 		"129": () => (import("/dist/129.js"))
/******/ 	};
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// [resolve, Promise] = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		721: 0
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
let __webpack_exports__ = {};
/*!***********************!*\
  !*** ./fib-worker.js ***!
  \***********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__.e, __webpack_require__, __webpack_require__.* */
onmessage = async event => {
	const { fibonacci } = await __webpack_require__.e(/*! import() */ 129).then(() => (__webpack_require__(/*! ./fibonacci */ 3)));
	const value = JSON.parse(event.data);
	postMessage(`fib(${value}) = ${fibonacci(value)}`);
};
```

```javascript
var e,r,s,o={},a={};function t(e){var r=a[e];if(void 0!==r)return r.exports;var s=a[e]={exports:{}};return o[e](s,s.exports,t),s.exports}t.m=o,t.d=(e,r)=>{for(var s in r)t.o(r,s)&&!t.o(e,s)&&Object.defineProperty(e,s,{enumerable:!0,get:r[s]})},t.f={},t.e=e=>{var r=[];return t.f.j(e,r),Promise.all(r)},t.o=(e,r)=>Object.hasOwn(e,r),e={129:()=>import("/dist/129.js")},r={721:0},s=e=>{let{__webpack_esm_ids__:s,__webpack_esm_modules__:o,__webpack_esm_runtime__:a}=e;var i,n=0;for(Object.assign(t.m,o),a&&a(t);n<s.length;n++)i=s[n],t.o(r,i)&&r[i]&&r[i][0](),r[i]=0},t.f.j=(o,a)=>{var i=t.o(r,o)?r[o]:void 0;if(0!==i)if(i)a.push(i[1]);else{var n=Promise.race([e[o]().then(s,e=>{throw 0!==r[o]&&(r[o]=void 0),e}),new Promise(e=>i=r[o]=[e])]);a.push(i[1]=n)}},onmessage=async e=>{const{fibonacci:r}=await t.e(129).then(()=>t(129)),s=JSON.parse(e.data);postMessage(`fib(${s}) = ${r(s)}`)};
```

# dist/129.js

```javascript
export const __webpack_esm_ids__ = [129],
__webpack_esm_modules__ = {

/***/ 3
/*!**********************!*\
  !*** ./fibonacci.js ***!
  \**********************/
/*! namespace exports */
/*! export fibonacci [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   fibonacci: () => (/* binding */ fibonacci)
/* harmony export */ });
function fibonacci(n) {
	return n < 1 ? 0 : n <= 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2);
}


/***/ }

};
```

# Info

## Unoptimized

```
asset main.js 7.53 KiB [emitted] [javascript module] (name: main)
asset chat.js 5.75 KiB [emitted] [javascript module] (name: chat)
asset workers/fibonacci.js 5.41 KiB [emitted] [javascript module] (name: fibonacci)
asset 936.js 1010 bytes [emitted] [javascript module]
asset 129.js 829 bytes [emitted] [javascript module]
chunk (runtime: 9a81d90cfd0dfd13d748, main) 129.js 103 bytes [rendered]
  > ./fibonacci ./example.js 70:30-51
  > ./fibonacci ./fib-worker.js 2:29-50
  ./fibonacci.js 103 bytes [built] [code generated]
    [exports: fibonacci]
    [used exports unknown]
    import() ./fibonacci ./example.js 70:30-51
    import() ./fibonacci ./fib-worker.js 2:29-50
chunk (runtime: 1fad8bf8de78b0a77bfd) chat.js (chat) 442 bytes (javascript) 2.6 KiB (runtime) [entry] [rendered]
  > ./example.js 25:19-31:1
  runtime modules 2.6 KiB 5 modules
  ./chat-worker.js 442 bytes [built] [code generated]
    [used exports unknown]
    new Worker() ./chat-worker.js ./example.js 25:19-31:1
chunk (runtime: 9a81d90cfd0dfd13d748) workers/fibonacci.js (fibonacci) 176 bytes (javascript) 2.6 KiB (runtime) [entry] [rendered]
  > ./example.js 80:18-84:2
  runtime modules 2.6 KiB 5 modules
  ./fib-worker.js 176 bytes [built] [code generated]
    [used exports unknown]
    new Worker() ./fib-worker.js ./example.js 80:18-84:2
chunk (runtime: main) main.js (main) 2.25 KiB (javascript) 2.6 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 2.6 KiB 5 modules
  ./example.js 2.25 KiB [built] [code generated]
    [used exports unknown]
    entry ./example.js main
chunk (runtime: 1fad8bf8de78b0a77bfd) 936.js 152 bytes [rendered]
  > ./chat-module ./chat-worker.js 11:31-54
  > ./chat-module ./chat-worker.js 7:27-50
  ./chat-module.js 152 bytes [built] [code generated]
    [exports: add, history]
    [used exports unknown]
    import() ./chat-module ./chat-worker.js 7:27-50
    import() ./chat-module ./chat-worker.js 11:31-54
webpack X.X.X compiled successfully
```

## Production mode

```
asset main.js 2.25 KiB [emitted] [javascript module] [minimized] (name: main)
asset chat.js 1.17 KiB [emitted] [javascript module] [minimized] (name: chat)
asset workers/fibonacci.js 882 bytes [emitted] [javascript module] [minimized] (name: fibonacci)
asset 936.js 172 bytes [emitted] [javascript module] [minimized]
asset 129.js 150 bytes [emitted] [javascript module] [minimized]
chunk (runtime: 9a81d90cfd0dfd13d748, main) 129.js 103 bytes [rendered]
  > ./fibonacci ./fib-worker.js 2:29-50
  > ./fibonacci ./example.js 70:30-51
  ./fibonacci.js 103 bytes [built] [code generated]
    [exports: fibonacci]
    [all exports used]
    import() ./fibonacci ./example.js 70:30-51
    import() ./fibonacci ./fib-worker.js 2:29-50
chunk (runtime: 1fad8bf8de78b0a77bfd) chat.js (chat) 442 bytes (javascript) 2.78 KiB (runtime) [entry] [rendered]
  > ./example.js 25:19-31:1
  runtime modules 2.78 KiB 4 modules
  ./chat-worker.js 442 bytes [built] [code generated]
    [no exports used]
    new Worker() ./chat-worker.js ./example.js 25:19-31:1
chunk (runtime: 9a81d90cfd0dfd13d748) workers/fibonacci.js (fibonacci) 176 bytes (javascript) 2.43 KiB (runtime) [entry] [rendered]
  > ./example.js 80:18-84:2
  runtime modules 2.43 KiB 4 modules
  ./fib-worker.js 176 bytes [built] [code generated]
    [no exports used]
    new Worker() ./fib-worker.js ./example.js 80:18-84:2
chunk (runtime: main) main.js (main) 2.25 KiB (javascript) 2.43 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 2.43 KiB 4 modules
  ./example.js 2.25 KiB [built] [code generated]
    [no exports used]
    entry ./example.js main
chunk (runtime: 1fad8bf8de78b0a77bfd) 936.js 152 bytes [rendered]
  > ./chat-module ./chat-worker.js 11:31-54
  > ./chat-module ./chat-worker.js 7:27-50
  ./chat-module.js 152 bytes [built] [code generated]
    [exports: add, history]
    [all exports used]
    import() ./chat-module ./chat-worker.js 7:27-50
    import() ./chat-module ./chat-worker.js 11:31-54
webpack X.X.X compiled successfully
```
