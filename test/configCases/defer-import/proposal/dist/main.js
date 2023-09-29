/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
var _full_sync_js__WEBPACK_IMPORTED_MODULE_0___deferred_namespace_cache;
__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* deferred harmony import */ var _full_sync_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__.z(2, 0, []);
/* harmony import */ var _async_mod_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
/* deferred harmony import */ var _deep_async_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__.z(6, 0, [7], __webpack_handle_async_dependencies__);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_async_mod_js__WEBPACK_IMPORTED_MODULE_1__, _deep_async_js__WEBPACK_IMPORTED_MODULE_2__]);
([_async_mod_js__WEBPACK_IMPORTED_MODULE_1__, _deep_async_js__WEBPACK_IMPORTED_MODULE_2__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);




__configCases__deferImport__proposal.push("START entry.js");

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ fullSync: /*#__PURE__*/ (_full_sync_js__WEBPACK_IMPORTED_MODULE_0___deferred_namespace_cache || (_full_sync_js__WEBPACK_IMPORTED_MODULE_0___deferred_namespace_cache = __webpack_require__.z(2, /* namespace */ 0))), asyncMod: _async_mod_js__WEBPACK_IMPORTED_MODULE_1__, deepAsync: _deep_async_js__WEBPACK_IMPORTED_MODULE_2__ });

__configCases__deferImport__proposal.push("END entry.js");

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   x: () => (/* binding */ x)
/* harmony export */ });
/* harmony import */ var _full_sync_dep_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);


__configCases__deferImport__proposal.push("START full-sync.js");

let x = 1;

__configCases__deferImport__proposal.push("END full-sync.js");


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);


__configCases__deferImport__proposal.push("START full-sync-dep.js");
__configCases__deferImport__proposal.push("END full-sync-dep.js");


/***/ }),
/* 4 */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   x: () => (/* binding */ x)
/* harmony export */ });
/* harmony import */ var _async_mod_dep_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5);


__configCases__deferImport__proposal.push("START async-mod.js");

await 0;
let x = 2;

__configCases__deferImport__proposal.push("END async-mod.js");

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);


__configCases__deferImport__proposal.push("START async-mod-dep.js");
__configCases__deferImport__proposal.push("END async-mod-dep.js");


/***/ }),
/* 6 */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   x: () => (/* binding */ x)
/* harmony export */ });
/* harmony import */ var _deep_async_dep_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(7);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_deep_async_dep_js__WEBPACK_IMPORTED_MODULE_0__]);
_deep_async_dep_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];


__configCases__deferImport__proposal.push("START deep-async.js");

let x = 3;

__configCases__deferImport__proposal.push("END deep-async.js");

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),
/* 7 */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);


__configCases__deferImport__proposal.push("START deep-async-dep.js");
await 0;
__configCases__deferImport__proposal.push("END deep-async-dep.js");

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The deferred module cache
/******/ 	var __webpack_module_deferred_exports__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: __webpack_module_deferred_exports__[moduleId] || {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 		// delete __webpack_module_deferred_exports__[module];
/******/ 		// skipped because strictModuleErrorHandling is not enabled.
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/async module */
/******/ 	(() => {
/******/ 		var webpackQueues = typeof Symbol === "function" ? Symbol("webpack queues") : "__webpack_queues__";
/******/ 		var webpackExports = typeof Symbol === "function" ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 		var webpackError = typeof Symbol === "function" ? Symbol("webpack error") : "__webpack_error__";
/******/ 		var resolveQueue = (queue) => {
/******/ 			if(queue && queue.d < 1) {
/******/ 				queue.d = 1;
/******/ 				queue.forEach((fn) => (fn.r--));
/******/ 				queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 			}
/******/ 		}
/******/ 		var wrapDeps = (deps) => (deps.map((dep) => {
/******/ 			if(dep !== null && typeof dep === "object") {
/******/ 				if(dep[webpackQueues]) return dep;
/******/ 				if(dep.then) {
/******/ 					var queue = [];
/******/ 					queue.d = 0;
/******/ 					dep.then((r) => {
/******/ 						obj[webpackExports] = r;
/******/ 						resolveQueue(queue);
/******/ 					}, (e) => {
/******/ 						obj[webpackError] = e;
/******/ 						resolveQueue(queue);
/******/ 					});
/******/ 					var obj = {};
/******/ 					obj[webpackQueues] = (fn) => (fn(queue));
/******/ 					return obj;
/******/ 				}
/******/ 			}
/******/ 			var ret = {};
/******/ 			ret[webpackQueues] = x => {};
/******/ 			ret[webpackExports] = dep;
/******/ 			return ret;
/******/ 		}));
/******/ 		__webpack_require__.a = (module, body, hasAwait) => {
/******/ 			var queue;
/******/ 			hasAwait && ((queue = []).d = -1);
/******/ 			var depQueues = new Set();
/******/ 			var exports = module.exports;
/******/ 			var currentDeps;
/******/ 			var outerResolve;
/******/ 			var reject;
/******/ 			var promise = new Promise((resolve, rej) => {
/******/ 				reject = rej;
/******/ 				outerResolve = resolve;
/******/ 			});
/******/ 			promise[webpackExports] = exports;
/******/ 			promise[webpackQueues] = (fn) => (queue && fn(queue), depQueues.forEach(fn), promise["catch"](x => {}));
/******/ 			module.exports = promise;
/******/ 			body((deps) => {
/******/ 				currentDeps = wrapDeps(deps);
/******/ 				var fn;
/******/ 				var getResult = () => (currentDeps.map((d) => {
/******/ 					if(d[webpackError]) throw d[webpackError];
/******/ 					return d[webpackExports];
/******/ 				}))
/******/ 				var promise = new Promise((resolve) => {
/******/ 					fn = () => (resolve(getResult));
/******/ 					fn.r = 0;
/******/ 					var fnQueue = (q) => (q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn))));
/******/ 					currentDeps.map((dep) => (dep[webpackQueues](fnQueue)));
/******/ 				});
/******/ 				return fn.r ? promise : getResult();
/******/ 			}, (err) => ((err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue)));
/******/ 			queue && queue.d < 0 && (queue.d = 0);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			var def = {};
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; typeof current == 'object' && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 			}
/******/ 			def['default'] = () => (value);
/******/ 			__webpack_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make deferred namespace object */
/******/ 	(() => {
/******/ 		__webpack_require__.z = (moduleId, mode, asyncDepsIds, syncExtractModule) => {
/******/ 			// mode: 0 => namespace (esm)
/******/ 			// mode: 1 => default-only (esm strict cjs)
/******/ 			// mode: 2 => default-with-named (esm-cjs compat)
/******/ 			// mode: 3 => dynamic (if exports has __esModule, then esm, otherwise default-with-named)
/******/ 		
/******/ 			var skipFistGetTrap = asyncDepsIds && asyncDepsIds.length > 0;
/******/ 		
/******/ 			if (skipFistGetTrap) {
/******/ 				return Promise.all(asyncDepsIds.map(__webpack_require__)).then(continuation);
/******/ 			}
/******/ 			return continuation();
/******/ 		
/******/ 			function continuation() {
/******/ 				var cachedModule = __webpack_module_cache__[moduleId];
/******/ 				// optimization not applied when output.strictModuleErrorHandling is off
/******/ 		
/******/ 				if (mode == 1) {
/******/ 					var ns = Object.create(null);
/******/ 					__webpack_require__.r(ns);
/******/ 					__webpack_require__.d(ns, {
/******/ 						"default": () => {
/******/ 							var exports = __webpack_require__(moduleId);
/******/ 							__webpack_require__.d(ns, {
/******/ 								"default": () => (exports)
/******/ 							});
/******/ 							return exports;
/******/ 						}
/******/ 					});
/******/ 					return ns
/******/ 				}
/******/ 		
/******/ 				var init = () => {
/******/ 					ns = __webpack_require__(moduleId);
/******/ 					if (syncExtractModule) ns = syncExtractModule([ns])[0];
/******/ 					init = undefined;
/******/ 					if (mode == 3) {
/******/ 						if (ns.__esModule) mode = 0;
/******/ 						else mode = 2;
/******/ 					}
/******/ 					if (!!mode) return;
/******/ 					delete handler.defineProperty;
/******/ 					delete handler.deleteProperty;
/******/ 					delete handler.set;
/******/ 					delete handler.get;
/******/ 					delete handler.has;
/******/ 					delete handler.ownKeys;
/******/ 					delete handler.getOwnPropertyDescriptor;
/******/ 				}
/******/ 		
/******/ 				var ns = cachedModule && cachedModule.exports || __webpack_module_deferred_exports__[moduleId] || (__webpack_module_deferred_exports__[moduleId] = Object.create(null));
/******/ 				var handler = {
/******/ 					__proto__: null,
/******/ 					get: (target, name) => {
/******/ 						if (skipFistGetTrap) { skipFistGetTrap = false; return undefined; }
/******/ 						if (name === "__esModule") return true;
/******/ 						if (name === Symbol.toStringTag) return "Module";
/******/ 						if (init) init();
/******/ 						if (mode == 2 && name == "default" && !__webpack_require__.o(ns, name)) {
/******/ 							return ns;
/******/ 						}
/******/ 						return Reflect.get(ns, name);
/******/ 					},
/******/ 					has: (target, name) => {
/******/ 						if (name === "__esModule") return true;
/******/ 						if (name === Symbol.toStringTag) return true;
/******/ 						if (init) init();
/******/ 						return Reflect.has(ns, name);
/******/ 					},
/******/ 					ownKeys: () => {
/******/ 						if (init) init();
/******/ 						return Reflect.ownKeys(ns);
/******/ 					},
/******/ 					getOwnPropertyDescriptor: (target, name) => {
/******/ 						if (name === "__esModule") return { value: true, configurable: !!mode };
/******/ 						if (name === Symbol.toStringTag) return { value: "Module", configurable: !!mode };
/******/ 						if (init) init();
/******/ 						var desc = Reflect.getOwnPropertyDescriptor(ns, name);
/******/ 						if (mode == 2 && name == "default" && !desc) {
/******/ 							desc = { value: ns, configurable: true };
/******/ 						}
/******/ 						return desc;
/******/ 					},
/******/ 					defineProperty: (target, name) => {
/******/ 						if (init) init();
/******/ 						return Reflect.defineProperty(ns, name);
/******/ 					},
/******/ 					deleteProperty: () => (false),
/******/ 					set: () => (false),
/******/ 				}
/******/ 				return new Proxy(ns, handler);
/******/ 			}
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
it("should compile", async () => {
	const logs = global.__configCases__deferImport__proposal = [];

	// change to other way if webpack in the future rejects require a TLA esm.
	let mod = __webpack_require__(1);
	expect(mod).toBeInstanceOf(Promise);

	expect(logs).toEqual([
		"START async-mod-dep.js",
		"END async-mod-dep.js",
		"START async-mod.js",
		"START deep-async-dep.js"
	]);
	logs.length = 0;

	let { default: namespaces } = await mod;

	expect(logs).toEqual([
		"END async-mod.js",
		"END deep-async-dep.js",
		"START entry.js",
		"END entry.js"
	]);
	logs.length = 0;

	let fullSyncX = namespaces.fullSync.x;
	expect(fullSyncX).toBe(1);
	expect(logs).toEqual([
		"START full-sync-dep.js",
		"END full-sync-dep.js",
		"START full-sync.js",
		"END full-sync.js"
	]);
	logs.length = 0;

	let asyncModX = namespaces.asyncMod.x;
	expect(asyncModX).toBe(2);
	expect(logs).toEqual([]);

	let deepAsyncX = namespaces.deepAsync.x;
	expect(deepAsyncX).toBe(3);
	expect(logs).toEqual([
		"START deep-async.js",
		"END deep-async.js"
	]);
});

})();

/******/ })()
;