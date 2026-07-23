# example.js

```javascript
import "./style.css";
import "./style2.css";
import { main } from "./style.module.css";
import("./lazy-style.css");

document.getElementsByTagName("main")[0].className = main;
```

# style.css

```css
@import "style-imported.css";
@import "https://fonts.googleapis.com/css?family=Open+Sans";

body {
	background: green;
	font-family: "Open Sans";
}
```

# style.module.css

```css
:root {
	--large: 72px;
}

.main {
	font-size: var(--large);
	color: darkblue;
}

@media (min-width: 1024px) {
	.main {
		color: green;
	}
}

@supports (display: grid) {
	.main {
		display: grid
	}
}
```

# webpack.config.js

The config also registers a small plugin that reads each CSS module's name map
(original class/id name -> generated scoped name) from
`module.buildInfo.cssData.exports` and writes it to a JSON sidecar — the
native-CSS equivalent of the postcss-modules `getJSON` callback. Lightning CSS
exposes the same data as the `exports` value returned from `transform()`; webpack
exposes it as data too, so no callback option is needed.

```javascript
"use strict";

const path = require("path");

/** @typedef {import("webpack").Compiler} Compiler */

// A valid JS identifier can be a named export; other keys (e.g. `--foo` custom
// properties exported as `foo-bar`) are only reachable via `import * as styles`.
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * Renames a CSS module's export map into a `.d.ts`. webpack's native CSS
 * defaults to `namedExports: true`, so each identifier-safe name is emitted as a
 * `export const … : string`, matching `import { foo } from "./x.module.css"`.
 * @param {string} source the CSS module resource path
 * @param {Map<string, string>} exports the original-name -> scoped-name map
 * @returns {string} the `.d.ts` contents
 */
const toDts = (source, exports) => {
	const lines = [
		`// Generated from ${path.basename(
			source
		)} by CssModuleTypesPlugin. Do not edit.`
	];
	for (const name of exports.keys()) {
		if (IDENTIFIER.test(name)) lines.push(`export const ${name}: string;`);
	}
	return `${lines.join("\n")}\n`;
};

/**
 * Emits, per CSS module, both the name map as JSON (the native-CSS equivalent of
 * the postcss-modules `getJSON` callback) and a TypeScript `.d.ts` so
 * `import … from "./x.module.css"` is typed. Both are derived from
 * `module.buildInfo.cssData.exports` (a `Map<string, string>` of original name
 * -> generated scoped name), the same source webpack uses for the JS exports —
 * so no separate re-parse of the CSS is needed. Lightning CSS exposes the same
 * data as the `exports` value returned from `transform()`.
 */
class CssModuleTypesPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { RawSource } = compiler.webpack.sources;
		const { Compilation } = compiler.webpack;

		compiler.hooks.thisCompilation.tap(
			"CssModuleTypesPlugin",
			(compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: "CssModuleTypesPlugin",
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						for (const module of compilation.modules) {
							const cssData =
								/** @type {{ exports?: Map<string, string> }=} */
								(module.buildInfo && module.buildInfo.cssData);
							if (!cssData || !cssData.exports || cssData.exports.size === 0) {
								continue;
							}
							const { resource } =
								/** @type {import("webpack").NormalModule} */ (module);
							const base = path.basename(resource);
							compilation.emitAsset(
								`${base}.json`,
								new RawSource(
									`${JSON.stringify(
										Object.fromEntries(cssData.exports),
										null,
										2
									)}\n`
								)
							);
							compilation.emitAsset(
								`${base}.d.ts`,
								new RawSource(toDts(resource, cssData.exports))
							);
						}
					}
				);
			}
		);
	}
}

/** @type {import("webpack").Configuration} */
const config = {
	output: {
		uniqueName: "app"
	},
	experiments: {
		css: true
	},
	plugins: [new CssModuleTypesPlugin()]
};

module.exports = config;
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 6
/*!******************************!*\
  !*** css ./style.module.css ***!
  \******************************/
/*! namespace exports */
/*! export large [provided] [no usage info] [missing usage info prevents renaming] */
/*! export main [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, module, has css modules, __webpack_require__.* */
(module, __unused_webpack_exports, __webpack_require__) {

__webpack_require__.r(module.exports = {
	"large": "--QRIlVD",
	"main": "zI6JBT"
});


/***/ }

/******/ 	});
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get css chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.k = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".output.css";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".output.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		const inProgress = {};
/******/ 		const dataWebpackPrefix = "app:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			let script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				const scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					const s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
/******/ 		
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			const onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				const doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode?.removeChild(script);
/******/ 				doneFns?.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			const timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/css loading */
/******/ 	(() => {
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		const installedChunks = {
/******/ 			0: 0
/******/ 		};
/******/ 		
/******/ 		const uniqueName = "app";
/******/ 		const loadingAttribute = "data-webpack-loading";
/******/ 		const loadStylesheet = (chunkId, url, done) => {
/******/ 			let link, needAttach, key = "chunk-" + chunkId;
/******/ 		
/******/ 			const links = document.getElementsByTagName("link");
/******/ 			for(var i = 0; i < links.length; i++) {
/******/ 				const l = links[i];
/******/ 				if(l.rel == "stylesheet" && (l.href == url || l.getAttribute("href") == url || l.getAttribute("data-webpack") == uniqueName + ":" + key)) { link = l; break; }
/******/ 			}
/******/ 			if(!done) return link;
/******/ 		
/******/ 			if(!link) {
/******/ 				needAttach = true;
/******/ 				link = document.createElement('link');
/******/ 				link.charset = 'utf-8';
/******/ 				if (__webpack_require__.nc) {
/******/ 					link.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				link.setAttribute("data-webpack", uniqueName + ":" + key);
/******/ 		
/******/ 				link.setAttribute(loadingAttribute, 1);
/******/ 				link.rel = "stylesheet";
/******/ 				link.href = url;
/******/ 			}
/******/ 			let timeout;
/******/ 			const onLinkComplete = (prev, event) => {
/******/ 				link.onerror = link.onload = null;
/******/ 				link.removeAttribute(loadingAttribute);
/******/ 				clearTimeout(timeout);
/******/ 				if(event && event.type != "load") link.parentNode.removeChild(link)
/******/ 				done(event);
/******/ 				if(prev) return prev(event);
/******/ 			};
/******/ 			if(link.getAttribute(loadingAttribute)) {
/******/ 				timeout = setTimeout(onLinkComplete.bind(null, undefined, { type: 'timeout', target: link }), 120000);
/******/ 				link.onerror = onLinkComplete.bind(null, link.onerror);
/******/ 				link.onload = onLinkComplete.bind(null, link.onload);
/******/ 			} else onLinkComplete(undefined, { type: 'load', target: link });
/******/ 		
/******/ 			if (needAttach) {
/******/ 				document.head.appendChild(link);
/******/ 			}
/******/ 			return link;
/******/ 		};
/******/ 		__webpack_require__.f.css = (chunkId, promises) => {
/******/ 			// css chunk loading
/******/ 			let installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 			if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 				// a Promise means "currently loading".
/******/ 				if(installedChunkData) {
/******/ 					promises.push(installedChunkData[2]);
/******/ 				} else {
/******/ 					if(true) { // all chunks have CSS
/******/ 						// setup Promise in chunk cache
/******/ 						const promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 						promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 						// start chunk loading
/******/ 						const url = __webpack_require__.p + __webpack_require__.k(chunkId);
/******/ 						// create error before stack unwound to get useful stacktrace later
/******/ 						const error = new Error();
/******/ 						const loadingEnded = (event) => {
/******/ 							if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 								installedChunkData = installedChunks[chunkId];
/******/ 								if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 								if(installedChunkData) {
/******/ 									if(event.type !== "load") {
/******/ 										const errorType = event && event.type;
/******/ 										const realHref = event && event.target && event.target.href;
/******/ 										error.message = 'Loading css chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realHref + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realHref;
/******/ 										error.event = event;
/******/ 										installedChunkData[1](error);
/******/ 									} else {
/******/ 										installedChunks[chunkId] = 0;
/******/ 										installedChunkData[0]();
/******/ 									}
/******/ 								}
/******/ 							}
/******/ 						};
/******/ 		
/******/ 							loadStylesheet(chunkId, url, loadingEnded);
/******/ 					} else installedChunks[chunkId] = 0;
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		// no hmr
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		const installedChunks = {
/******/ 			0: 0
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				let installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							const promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							const url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							const error = new Error();
/******/ 							const loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										const errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										const realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										error.event = event;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		const webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			let [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		const chunkLoadingGlobal = self["webpackChunkapp"] = self["webpackChunkapp"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
let __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.e, __webpack_require__.* */
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _style_module_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./style.module.css */ 6);



__webpack_require__.e(/*! import() */ 1).then(__webpack_require__.bind(__webpack_require__, /*! ./lazy-style.css */ 7));

document.getElementsByTagName("main")[0].className = _style_module_css__WEBPACK_IMPORTED_MODULE_0__.main;

})();

/******/ })()
;
```

# dist/output.css

```javascript
/*!********************************************************************!*\
  !*** external "https://fonts.googleapis.com/css?family=Open+Sans" ***!
  \********************************************************************/
@import url("https://fonts.googleapis.com/css?family=Open+Sans");
/*!********************************!*\
  !*** css ./style-imported.css ***!
  \********************************/
.img {
	width: 150px;
	height: 150px;
	background: url(dist/89a353e9c515885abd8e.png);
}

/*!***********************!*\
  !*** css ./style.css ***!
  \***********************/

body {
	background: green;
	font-family: "Open Sans";
}

/*!************************!*\
  !*** css ./style2.css ***!
  \************************/
body {
	background: red;
}

/*!******************************!*\
  !*** css ./style.module.css ***!
  \******************************/
:root {
	--QRIlVD: 72px;
}

.zI6JBT {
	font-size: var(--QRIlVD);
	color: darkblue;
}

@media (min-width: 1024px) {
	.zI6JBT {
		color: green;
	}
}

@supports (display: grid) {
	.zI6JBT {
		display: grid
	}
}
```

## production

```javascript
@import url("https://fonts.googleapis.com/css?family=Open+Sans");
.img {
	width: 150px;
	height: 150px;
	background: url(dist/89a353e9c515885abd8e.png);
}


body {
	background: green;
	font-family: "Open Sans";
}

body {
	background: red;
}

:root {
	--QRIlVD: 72px;
}

.zI6JBT {
	font-size: var(--QRIlVD);
	color: darkblue;
}

@media (min-width: 1024px) {
	.zI6JBT {
		color: green;
	}
}

@supports (display: grid) {
	.zI6JBT {
		display: grid
	}
}
```

# dist/1.output.css

```javascript
/*!****************************!*\
  !*** css ./lazy-style.css ***!
  \****************************/
body {
	color: blue;
}
```

# dist/style.module.css.json

The CSS Modules name map emitted by the plugin — the same shape postcss-modules
passes to its `getJSON` callback.

```json
{
  "large": "--QRIlVD",
  "main": "zI6JBT"
}
```

# dist/style.module.css.d.ts

The plugin also emits a TypeScript declaration so imports of the CSS module are
typed. No bundler ships this natively today — the map webpack already computes
makes it a few lines of plugin.

```typescript
// Generated from style.module.css by CssModuleTypesPlugin. Do not edit.
export const large: string;
export const main: string;
```

With the declaration in place, the import in `example.js` is fully typed:

```typescript
import { main } from "./style.module.css"; // main: string
```

To make an editor pick it up, write the `.d.ts` next to the source file (e.g.
`style.module.css.d.ts`) instead of into `dist` — change the plugin's
`emitAsset` to a write next to `module.resource`, or run it as a separate
type-generation step. This example emits into `dist` to keep the source tree
clean.

# What native CSS scopes (CSS Modules)

webpack's native CSS localizes more identifiers than any classic loader. For a
`css/module` (or auto-detected `*.module.css`):

- **Always:** class (`.foo`) and id (`#foo`) selectors.
- **Explicit, per parser option (all default `true`):** `@keyframes` +
  `animation-name` (`animation`), grid line/area names (`grid`),
  `@counter-style` + `list-style` (`customIdents`), `@container` +
  `container-name` (`container`), `@function` names + calls (`function`),
  `view-transition-name`/`-group`/`-class` + `::view-transition-*()` pseudo
  arguments (`customIdents`).
- **Auto (any `--foo` dashed ident, via `dashedIdents`, default `true`):** custom
  properties and `var(--foo)` incl. cross-file `var(--foo from "./x.css")` and
  `from global`; `@property` / `@font-palette-values` / `@color-profile` names;
  anchor positioning (`anchor-name`, `position-anchor`, `anchor()`,
  `@position-try`, `anchor-scope`); scroll-driven-animation names; and
  `@container style(--foo)` queries. New dashed-ident CSS features are covered
  automatically, with no feature-specific code.
- **Composition / values:** `composes` (same-file, `from "./x.css"`,
  `from global`), `@value` (incl. cross-file), ICSS `:import` / `:export`.

Intentionally left **global** (they coordinate across documents or the whole
app, so scoping would break them): `@layer` and `@page` names,
`@font-feature-values` family names, `@view-transition` `types`, and
`:global(...)` selectors.

# Info

## Unoptimized

```
assets by path *.js 15.6 KiB
  asset output.js 15.3 KiB [emitted] (name: main)
  asset 1.output.js 332 bytes [emitted]
assets by path *.css 1.16 KiB
  asset output.css 1.04 KiB [emitted] (name: main)
  asset 1.output.css 125 bytes [emitted]
asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: images/file.png] (auxiliary name: main)
asset style.module.css.d.ts 128 bytes [emitted]
asset style.module.css.json 46 bytes [emitted]
Entrypoint main 16.3 KiB (14.6 KiB) = output.js 15.3 KiB output.css 1.04 KiB 1 auxiliary asset
chunk (runtime: main) output.js, output.css (main) 254 bytes (javascript) 14.6 KiB (asset) 42 bytes (asset-url) 454 bytes (css) 42 bytes (css-import) 8.87 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 8.87 KiB 9 modules
  dependent modules 14.6 KiB (asset) 42 bytes (asset-url) 454 bytes (css) 78 bytes (javascript) 42 bytes (css-import) [dependent] 6 modules
  ./example.js 176 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
chunk (runtime: main) 1.output.js, 1.output.css 1 bytes (javascript) 23 bytes (css) [rendered]
  > ./lazy-style.css ./example.js 4:0-26
  css ./lazy-style.css 1 bytes (javascript) 23 bytes (css) [built] [code generated]
    [no exports]
    [used exports unknown]
    import() ./lazy-style.css ./example.js 4:0-26
webpack X.X.X compiled successfully
```

## Production mode

```
assets by path *.js 3.26 KiB
  asset output.js 3.18 KiB [emitted] [minimized] (name: main)
  asset 822.output.js 85 bytes [emitted] [minimized]
assets by path *.css 475 bytes
  asset output.css 451 bytes [emitted] (name: main)
  asset 822.output.css 24 bytes [emitted]
asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: images/file.png] (auxiliary name: main)
asset style.module.css.d.ts 100 bytes [emitted]
asset style.module.css.json 23 bytes [emitted]
Entrypoint main 3.62 KiB (14.6 KiB) = output.js 3.18 KiB output.css 451 bytes 1 auxiliary asset
chunk (runtime: main) output.js, output.css (main) 504 bytes (javascript) 14.6 KiB (asset) 42 bytes (asset-url) 454 bytes (css) 42 bytes (css-import) 8.63 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 8.63 KiB 8 modules
  dependent modules 14.6 KiB (asset) 42 bytes (javascript) 42 bytes (asset-url) 79 bytes (css) 42 bytes (css-import) [dependent] 3 modules
  built modules 462 bytes (javascript) 375 bytes (css) [built]
    ./example.js + 5 modules 403 bytes [not cacheable] [built] [code generated]
      [no exports]
      [no exports used]
      entry ./example.js main
    css ./style.css 148 bytes [built] [code generated]
      [no exports]
      [no exports used]
    css ./style.module.css 59 bytes (javascript) 200 bytes (css) [built] [code generated]
      [exports: large, main]
      [only some exports used: main]
    css ./style2.css 27 bytes [built] [code generated]
      [no exports]
      [no exports used]
chunk (runtime: main) 822.output.js, 822.output.css 1 bytes (javascript) 23 bytes (css) [rendered]
  > ./lazy-style.css ./example.js 4:0-26
  css ./lazy-style.css 1 bytes (javascript) 23 bytes (css) [built] [code generated]
    [no exports]
    import() ./lazy-style.css ./example.js + 5 modules ./example.js 4:0-26
webpack X.X.X compiled successfully
```
