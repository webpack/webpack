# webpack.config.js

```javascript
const path = require("path");
const { ModuleFederationPlugin } = require("../../").container;
const devDeps = require("../../package.json").devDependencies;
const rules = [
	{
		test: /\.js$/,
		include: path.resolve(__dirname, "src"),
		use: {
			loader: "babel-loader",
			options: {
				presets: ["@babel/react"]
			}
		}
	}
];
const optimization = {
	chunkIds: "named", // for this example only: readable filenames in production too
	nodeEnv: "production" // for this example only: always production version of react
};
const stats = {
	chunks: true,
	modules: false,
	chunkModules: false,
	chunkRootModules: true,
	chunkOrigins: true
};
module.exports = (env = "development") => [
	{
		name: "app",
		mode: env,
		entry: {
			app: "./src/index.js"
		},
		output: {
			filename: "[name].js",
			path: path.resolve(__dirname, "dist/aaa"),
			publicPath: "dist/aaa/",

			// Each build needs a unique name
			// to avoid runtime collisions
			// The default uses "name" from package.json
			uniqueName: "module-federation-aaa"
		},
		module: { rules },
		optimization,
		plugins: [
			new ModuleFederationPlugin({
				// List of remotes with URLs
				remotes: {
					"mfe-b": "mfeBBB@/dist/bbb/mfeBBB.js",
					"mfe-c": "mfeCCC@/dist/ccc/mfeCCC.js"
				},

				// list of shared modules with version requirement and other options
				shared: {
					react: {
						singleton: true, // make sure only a single react module is used
						requiredVersion: devDeps.react // e. g. "^16.8.0"
					}
				}
			})
		],
		stats
	},
	{
		name: "mfe-b",
		mode: env,
		entry: {},
		output: {
			filename: "[name].js",
			path: path.resolve(__dirname, "dist/bbb"),
			publicPath: "dist/bbb/",
			uniqueName: "module-federation-bbb"
		},
		module: { rules },
		optimization,
		plugins: [
			new ModuleFederationPlugin({
				// A unique name
				name: "mfeBBB",

				// List of exposed modules
				exposes: {
					"./Component": "./src-b/Component"
				},

				// list of shared modules with version requirement and other options
				// Here date-fns is shared with the other remote, host doesn't know about that
				shared: {
					"date-fns": devDeps["date-fns"], // e. g. "^2.12.0"
					react: {
						singleton: true, // must be specified in each config
						requiredVersion: devDeps.react
					}
				}
			})
		],
		stats
	},
	{
		name: "mfe-c",
		mode: env,
		entry: {},
		output: {
			filename: "[name].js",
			path: path.resolve(__dirname, "dist/ccc"),
			publicPath: "dist/ccc/",
			uniqueName: "module-federation-ccc"
		},
		module: { rules },
		optimization,
		plugins: [
			new ModuleFederationPlugin({
				name: "mfeCCC",

				exposes: {
					"./Component": "./src-c/Component",
					"./Component2": "./src-c/LazyComponent"
				},

				shared: {
					"date-fns": devDeps["date-fns"],
					lodash: devDeps["lodash"],
					react: {
						singleton: true,
						requiredVersion: devDeps.react
					}
				}
			})
		],
		stats
	}
];
```

# src/index.js

```javascript
// Sharing modules requires that all remotes are initialized
// and can provide shared modules to the common scope
// As this is an async operation we need an async boundary (import())

// Using modules from remotes is also an async operation
// as chunks need to be loaded for the code of the remote module
// This also requires an async boundary (import())

// At this point shared modules initialized and remote modules are loaded
import("./bootstrap");

// It's possible to place more code here to do stuff on page init
// but it can't use any of the shared modules or remote modules.
```

# src/bootstrap.js

```jsx
import ReactDom from "react-dom";
import React from "react"; // <- this is a shared module, but used as usual
import App from "./App";

// load app
const el = document.createElement("main");
ReactDom.render(<App />, el);
document.body.appendChild(el);

// remove spinner
document.body.removeChild(document.getElementsByClassName("spinner")[0]);
```

# src/App.js

```jsx
import React from "react";
import ComponentB from "mfe-b/Component"; // <- these are remote modules,
import ComponentC from "mfe-c/Component"; // <- but they are used as usual packages
import { de } from "date-fns/locale";

// remote modules can also be used with import() which lazy loads them as usual
const ComponentD = React.lazy(() => import("mfe-c/Component2"));

const App = () => (
	<article>
		<header>
			<h1>Hello World</h1>
		</header>
		<p>This component is from a remote container:</p>
		<ComponentB locale={de} />
		<p>And this component is from another remote container:</p>
		<ComponentC locale={de} />
		<React.Suspense fallback={<p>Lazy loading component...</p>}>
			<p>
				And this component is from this remote container too, but lazy loaded:
			</p>
			<ComponentD />
		</React.Suspense>
	</article>
);
export default App;
```

# index.html

```html
<html>
	<head>
		<style>
			.spinner {
				font-size: 10px;
				margin: 50px auto;
				text-indent: -9999em;
				width: 11em;
				height: 11em;
				border-radius: 50%;
				background: #595959;
				background: linear-gradient(
					to right,
					#595959 10%,
					rgba(89, 89, 89, 0) 42%
				);
				position: relative;
				animation: spin 1.4s infinite linear;
				transform: translateZ(0);
			}
			.spinner:before {
				width: 50%;
				height: 50%;
				background: #595959;
				border-radius: 100% 0 0 0;
				position: absolute;
				top: 0;
				left: 0;
				content: "";
			}
			.spinner:after {
				background: white;
				width: 75%;
				height: 75%;
				border-radius: 50%;
				content: "";
				margin: auto;
				position: absolute;
				top: 0;
				left: 0;
				bottom: 0;
				right: 0;
			}
			@-webkit-keyframes spin {
				0% {
					-webkit-transform: rotate(0deg);
					transform: rotate(0deg);
				}
				100% {
					-webkit-transform: rotate(360deg);
					transform: rotate(360deg);
				}
			}
			@keyframes spin {
				0% {
					-webkit-transform: rotate(0deg);
					transform: rotate(0deg);
				}
				100% {
					-webkit-transform: rotate(360deg);
					transform: rotate(360deg);
				}
			}
		</style>
	</head>
	<body>
		<!-- A spinner -->
		<div class="spinner"></div>

		<!-- This script only contains boostrapping logic -->
		<!-- It will load all other scripts if neccessary -->
		<script src="/dist/aaa/app.js" async></script>

		<!-- These script tags are optional -->
		<!-- They improve loading performance -->
		<!-- Omitting them will add an additional round trip -->
		<script src="/dist/bbb/mfeBBB.js" async></script>
		<script src="/dist/ccc/mfeCCC.js" async></script>

		<!-- All these scripts are pretty small ~5kb -->
		<!-- For optimal performance they can be inlined -->
	</body>
</html>
```

# src-b/Component.js

```jsx
import React from "react";
import { formatRelative, subDays } from "date-fns";
// date-fns is a shared module, but used as usual
// exposing modules act as async boundary,
// so no additional async boundary need to be added here
// As data-fns is an shared module, it will be placed in a separate file
// It will be loaded in parallel to the code of this module

const Component = ({ locale }) => (
	<div style={{ border: "5px solid darkblue" }}>
		<p>I'm a Component exposed from container B!</p>
		<p>
			Using date-fn in Remote:{" "}
			{formatRelative(subDays(new Date(), 2), new Date(), { locale })}
		</p>
	</div>
);
export default Component;
```

# dist/aaa/app.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 11:
/*!*********************************************!*\
  !*** external "mfeBBB@/dist/bbb/mfeBBB.js" ***!
  \*********************************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__.l, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
var error = new Error();
module.exports = new Promise((resolve, reject) => {
	if(typeof mfeBBB !== "undefined") return resolve();
	__webpack_require__.l("/dist/bbb/mfeBBB.js", (event) => {
		if(typeof mfeBBB !== "undefined") return resolve();
		var errorType = event && (event.type === 'load' ? 'missing' : event.type);
		var realSrc = event && event.target && event.target.src;
		error.message = 'Loading script failed.\n(' + errorType + ': ' + realSrc + ')';
		error.name = 'ScriptExternalLoadError';
		error.type = errorType;
		error.request = realSrc;
		reject(error);
	}, "mfeBBB");
}).then(() => mfeBBB)

/***/ }),

/***/ 13:
/*!*********************************************!*\
  !*** external "mfeCCC@/dist/ccc/mfeCCC.js" ***!
  \*********************************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__.l, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
var error = new Error();
module.exports = new Promise((resolve, reject) => {
	if(typeof mfeCCC !== "undefined") return resolve();
	__webpack_require__.l("/dist/ccc/mfeCCC.js", (event) => {
		if(typeof mfeCCC !== "undefined") return resolve();
		var errorType = event && (event.type === 'load' ? 'missing' : event.type);
		var realSrc = event && event.target && event.target.src;
		error.message = 'Loading script failed.\n(' + errorType + ': ' + realSrc + ')';
		error.name = 'ScriptExternalLoadError';
		error.type = errorType;
		error.request = realSrc;
		reject(error);
	}, "mfeCCC");
}).then(() => mfeCCC)

/***/ })

/******/ 	});
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
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
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			var def = {};
/******/ 			if(mode & 2 && typeof value == 'object' && value) {
/******/ 				for(const key in value) def[key] = () => value[key];
/******/ 			}
/******/ 			def['default'] = () => value;
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
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", key);
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (event) => {
/******/ 				onScriptComplete = () => {
/******/ 		
/******/ 				}
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => fn(event));
/******/ 			}
/******/ 			;
/******/ 			var timeout = setTimeout(() => {
/******/ 				onScriptComplete({ type: 'timeout', target: script })
/******/ 			}, 120000);
/******/ 			script.onerror = script.onload = onScriptComplete;
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
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
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/aaa/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/remotes loading */
/******/ 	(() => {
/******/ 		var installedModules = {};
/******/ 		var chunkMapping = {
/******/ 			"src_bootstrap_js": [
/******/ 				10,
/******/ 				12
/******/ 			],
/******/ 			"webpack_container_remote_mfe-c_Component2": [
/******/ 				26
/******/ 			]
/******/ 		};
/******/ 		var idToExternalAndNameMapping = {
/******/ 			"10": [
/******/ 				"default",
/******/ 				"./Component",
/******/ 				11
/******/ 			],
/******/ 			"12": [
/******/ 				"default",
/******/ 				"./Component",
/******/ 				13
/******/ 			],
/******/ 			"26": [
/******/ 				"default",
/******/ 				"./Component2",
/******/ 				13
/******/ 			]
/******/ 		};
/******/ 		__webpack_require__.f.remotes = (chunkId, promises) => {
/******/ 			if(__webpack_require__.o(chunkMapping, chunkId)) {
/******/ 				chunkMapping[chunkId].forEach((id) => {
/******/ 					if(installedModules[id]) return promises.push(installedModules[id]);
/******/ 					var data = idToExternalAndNameMapping[id];
/******/ 					var onError = (error) => {
/******/ 						if(!error) error = new Error("Container missing");
/******/ 						if(typeof error.message === "string")
/******/ 							error.message += '\nwhile loading "' + data[1] + '" from ' + data[2];
/******/ 						__webpack_modules__[id] = () => {
/******/ 							throw error;
/******/ 						}
/******/ 						installedModules[id] = 0;
/******/ 					};
/******/ 					var handleFunction = (fn, key, data, next, first) => {
/******/ 						try {
/******/ 							var promise = fn(key, data);
/******/ 							if(promise && promise.then) {
/******/ 								var p = promise.then((result) => next(result, data), onError);
/******/ 								if(first) promises.push(installedModules[id] = p); else return p;
/******/ 							} else {
/******/ 								return next(promise, data, first);
/******/ 							}
/******/ 						} catch(error) {
/******/ 							onError(error);
/******/ 						}
/******/ 					}
/******/ 					var onExternal = (external, _, first) => external ? handleFunction(__webpack_require__.I, data[0], external, onInitialized, first) : onError();
/******/ 					var onInitialized = (_, external, first) => handleFunction(external.get, data[1], external, onFactory, first);
/******/ 					var onFactory = (factory) => {
/******/ 						installedModules[id] = 1;
/******/ 						__webpack_modules__[id] = (module) => {
/******/ 							module.exports = factory();
/******/ 						}
/******/ 					};
/******/ 					handleFunction(__webpack_require__, data[2], 1, onExternal, 1);
/******/ 				});
/******/ 			}
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/sharing */
/******/ 	(() => {
/******/ 		__webpack_require__.S = {};
/******/ 		var initPromises = {};
/******/ 		__webpack_require__.I = (name) => {
/******/ 			// only runs once
/******/ 			if(initPromises[name]) return initPromises[name];
/******/ 			// handling circular init calls
/******/ 			initPromises[name] = 1;
/******/ 			// creates a new share scope if needed
/******/ 			if(!__webpack_require__.o(__webpack_require__.S, name)) __webpack_require__.S[name] = {};
/******/ 			// runs all init snippets from all modules reachable
/******/ 			var scope = __webpack_require__.S[name];
/******/ 			var warn = (msg) => typeof console !== "undefined" && console.warn && console.warn(msg);;
/******/ 			var register = (name, version, factory, currentName) => {
/******/ 				version = version || [];
/******/ 				currentName = name;
/******/ 				var versionConflict = () => warn("Version conflict for shared modules: " + name + " " + (v && v.join(".")) + " <=> " + (version && version.join(".")));;
/******/ 				var registerCurrent = () => {
/******/ 					if(scope[currentName]) {
/******/ 						var v = scope[currentName].version || [];
/******/ 						for(var i = 0; i < version.length && i < v.length; i++) {
/******/ 							if(v[i] != version[i]) { // loose equal is intentional to match string and number
/******/ 								if(typeof v[i] === "string" || typeof version[i] === "string") return versionConflict();
/******/ 								if(v[i] > version[i]) return;
/******/ 								if(v[i] < version[i]) { i = -1; break; }
/******/ 							}
/******/ 						}
/******/ 						if(i >= 0 && version.length <= v.length) return;
/******/ 						if(scope[currentName].loaded) return warn("Ignoring providing of already used shared module: " + name);
/******/ 					}
/******/ 					scope[currentName] = { get: factory, version: version };
/******/ 				};
/******/ 				registerCurrent();
/******/ 				version.forEach((part) => {
/******/ 					currentName += "`" + part;
/******/ 					registerCurrent();
/******/ 				});
/******/ 			};
/******/ 			var initExternal = (id) => {
/******/ 				var handleError = (err) => warn("Initialization of sharing external failed: " + err);
/******/ 				try {
/******/ 					var module = __webpack_require__(id);
/******/ 					if(!module) return;
/******/ 					var initFn = (module) => module && module.init && module.init(__webpack_require__.S[name])
/******/ 					if(module.then) return promises.push(module.then(initFn, handleError));
/******/ 					var initResult = initFn(module);
/******/ 					if(initResult && initResult.then) return promises.push(initResult.catch(handleError));
/******/ 				} catch(err) { handleError(err); }
/******/ 			}
/******/ 			var promises = [];
/******/ 			switch(name) {
/******/ 				case "default": {
/******/ 					register("react", [16,13,1], () => __webpack_require__.e("node_modules_react_index_js-_11190").then(() => () => __webpack_require__(/*! react */ 24)));
/******/ 					initExternal(11);
/******/ 					initExternal(13);
/******/ 				}
/******/ 				break;
/******/ 			}
/******/ 			return promises.length && (initPromises[name] = Promise.all(promises).then(() => initPromises[name] = 1));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/consumes */
/******/ 	(() => {
/******/ 		var ensureExistence = (scope, scopeName, key) => {
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) throw new Error("Shared module " + key + " doesn't exist in shared scope " + scopeName);
/******/ 		};
/******/ 		var invalidVersion = (version, requiredVersion) => {
/******/ 			for(var i = 0; i < requiredVersion.length; i++) {
/******/ 				if(i === version.length) return 1;
/******/ 				if(version[i] != requiredVersion[i]) { // loose equal is intentional to match string and number
/******/ 					if(typeof version[i] === "string" || typeof requiredVersion[i] === "string" || version[i] < requiredVersion[i]) return 1;
/******/ 					if(version[i] > requiredVersion[i]) return;
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		var checkSingletonVersion = (key, version, requiredVersion, strict) => {
/******/ 			if(!invalidVersion(version, requiredVersion)) return 1;
/******/ 			var msg = "Unsatisfied version of shared singleton module " + key + "@" + (version && version.join(".")) + " (required " + key + "@" + requiredVersion.join(".") + ")";
/******/ 			if(strict) throw new Error(msg);
/******/ 			typeof console !== "undefined" && console.warn && console.warn(msg);
/******/ 		};
/******/ 		var findVersion = (scope, key, requiredVersion, strict) => {
/******/ 			requiredVersion = requiredVersion || [];
/******/ 			var currentName = key;
/******/ 			var versions = requiredVersion.map((v) => currentName += "`" + v);
/******/ 			versions.unshift(key);
/******/ 			var lastVersion;
/******/ 			while(currentName = versions.shift()) {
/******/ 				if(__webpack_require__.o(scope, currentName) && !invalidVersion(lastVersion = scope[currentName].version || [], requiredVersion)) return scope[currentName];
/******/ 			}
/******/ 			var msg = "Unsatisfied version of shared module " + key + "@" + (lastVersion && lastVersion.join(".")) + " (required " + key + "@" + requiredVersion.join(".") + ")";
/******/ 			if(strict) throw new Error(msg);
/******/ 			typeof console !== "undefined" && console.warn && console.warn(msg);
/******/ 		};
/******/ 		var get = (sharedModule) => (sharedModule.loaded = 1, sharedModule.get());
/******/ 		var load = (scopeName, key) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var loadFallback = (scopeName, key, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			return scope && __webpack_require__.o(scope, key) ? get(scope[key]) : fallback();
/******/ 		};
/******/ 		var loadVersionCheck = (scopeName, key, version) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			return get(findVersion(scope, key, version) || scope[key]);
/******/ 		};
/******/ 		var loadSingletonVersionCheck = (scopeName, key, version) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			checkSingletonVersion(key, scope[key].version, version);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var loadStrictVersionCheck = (scopeName, key, version) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			return get(findVersion(scope, key, version, 1));
/******/ 		};
/******/ 		var loadStrictSingletonVersionCheck = (scopeName, key, version) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			checkSingletonVersion(key, scope[key].version, version, 1);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var loadVersionCheckFallback = (scopeName, key, version, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			return get(findVersion(scope, key, version) || scope[key]);
/******/ 		};
/******/ 		var loadSingletonVersionCheckFallback = (scopeName, key, version, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			checkSingletonVersion(key, scope[key].version, version);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var loadStrictVersionCheckFallback = (scopeName, key, version, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			var entry = scope && findVersion(scope, key, version);
/******/ 			return entry ? get(entry) : fallback();
/******/ 		};
/******/ 		var loadStrictSingletonVersionCheckFallback = (scopeName, key, version, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			checkSingletonVersion(key, scope[key].version, version, 1);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var installedModules = {};
/******/ 		var moduleToHandlerMapping = {
/******/ 			5: () => loadSingletonVersionCheckFallback("default", "react", ["16",8,0], () => __webpack_require__.e("node_modules_react_index_js-_11191").then(() => () => __webpack_require__(/*! react */ 24)))
/******/ 		};
/******/ 		// no consumes in initial chunks
/******/ 		var chunkMapping = {
/******/ 			"src_bootstrap_js": [
/******/ 				5
/******/ 			]
/******/ 		};
/******/ 		__webpack_require__.f.consumes = (chunkId, promises) => {
/******/ 			if(__webpack_require__.o(chunkMapping, chunkId)) {
/******/ 				chunkMapping[chunkId].forEach((id) => {
/******/ 					if(__webpack_require__.o(installedModules, id)) return promises.push(installedModules[id]);
/******/ 					var onFactory = (factory) => {
/******/ 						installedModules[id] = 0;
/******/ 						__webpack_modules__[id] = (module) => {
/******/ 							delete __webpack_module_cache__[id];
/******/ 							module.exports = factory();
/******/ 						}
/******/ 					};
/******/ 					var onError = (error) => {
/******/ 						delete installedModules[id];
/******/ 						__webpack_modules__[id] = (module) => {
/******/ 							delete __webpack_module_cache__[id];
/******/ 							throw error;
/******/ 						}
/******/ 					};
/******/ 					try {
/******/ 						var promise = moduleToHandlerMapping[id]();
/******/ 						if(promise.then) {
/******/ 							promises.push(installedModules[id] = promise.then(onFactory).catch(onError));
/******/ 						} else onFactory(promise);
/******/ 					} catch(e) { onError(e); }
/******/ 				});
/******/ 			}
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"app": 0
/******/ 		};
/******/ 		
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if("webpack_container_remote_mfe-c_Component2" != chunkId) {
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => {
/******/ 								installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 							});
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId);
/******/ 						} else installedChunks[chunkId] = 0;
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
/******/ 		// no deferred startup
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 		
/******/ 			var runtime = data[3];
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonpmodule_federation_aaa"] = window["webpackJsonpmodule_federation_aaa"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
(() => {
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [unused] */
/*! runtime requirements: __webpack_require__.e, __webpack_require__, __webpack_require__.* */
// Sharing modules requires that all remotes are initialized
// and can provide shared modules to the common scope
// As this is an async operation we need an async boundary (import())
// Using modules from remotes is also an async operation
// as chunks need to be loaded for the code of the remote module
// This also requires an async boundary (import())
// At this point shared modules initialized and remote modules are loaded
__webpack_require__.e(/*! import() */ "src_bootstrap_js").then(__webpack_require__.bind(__webpack_require__, /*! ./bootstrap */ 2)); // It's possible to place more code here to do stuff on page init
// but it can't use any of the shared modules or remote modules.
})();

/******/ })()
;
```

# dist/bbb/mfeBBB.js

```javascript
var mfeBBB;mfeBBB =
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!***********************!*\
  !*** container entry ***!
  \***********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_require__.d, __webpack_require__.o, __webpack_exports__, __webpack_require__.e, __webpack_require__, __webpack_require__.* */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var moduleMap = {
	"./Component": () => {
		return __webpack_require__.e("src-b_Component_js").then(() => () => (__webpack_require__(/*! ./src-b/Component */ 3)));
	}
};
var get = (module) => {
	return (
		__webpack_require__.o(moduleMap, module)
			? moduleMap[module]()
			: Promise.resolve().then(() => {
				throw new Error('Module "' + module + '" does not exist in container.');
			})
	);
};
var init = (shareScope) => {
	var oldScope = __webpack_require__.S["default"];
	var name = "default"
	if(oldScope && oldScope !== shareScope) throw new Error("Container initialization failed as it has already been initialized with a different share scope");
	__webpack_require__.S[name] = shareScope;
	return __webpack_require__.I(name);
};

// This exports getters to disallow modifications
__webpack_require__.d(exports, {
	get: () => get,
	init: () => init
});

/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
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
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
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
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", key);
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (event) => {
/******/ 				onScriptComplete = () => {
/******/ 		
/******/ 				}
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => fn(event));
/******/ 			}
/******/ 			;
/******/ 			var timeout = setTimeout(() => {
/******/ 				onScriptComplete({ type: 'timeout', target: script })
/******/ 			}, 120000);
/******/ 			script.onerror = script.onload = onScriptComplete;
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
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
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/bbb/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/sharing */
/******/ 	(() => {
/******/ 		__webpack_require__.S = {};
/******/ 		var initPromises = {};
/******/ 		__webpack_require__.I = (name) => {
/******/ 			// only runs once
/******/ 			if(initPromises[name]) return initPromises[name];
/******/ 			// handling circular init calls
/******/ 			initPromises[name] = 1;
/******/ 			// creates a new share scope if needed
/******/ 			if(!__webpack_require__.o(__webpack_require__.S, name)) __webpack_require__.S[name] = {};
/******/ 			// runs all init snippets from all modules reachable
/******/ 			var scope = __webpack_require__.S[name];
/******/ 			var warn = (msg) => typeof console !== "undefined" && console.warn && console.warn(msg);;
/******/ 			var register = (name, version, factory, currentName) => {
/******/ 				version = version || [];
/******/ 				currentName = name;
/******/ 				var versionConflict = () => warn("Version conflict for shared modules: " + name + " " + (v && v.join(".")) + " <=> " + (version && version.join(".")));;
/******/ 				var registerCurrent = () => {
/******/ 					if(scope[currentName]) {
/******/ 						var v = scope[currentName].version || [];
/******/ 						for(var i = 0; i < version.length && i < v.length; i++) {
/******/ 							if(v[i] != version[i]) { // loose equal is intentional to match string and number
/******/ 								if(typeof v[i] === "string" || typeof version[i] === "string") return versionConflict();
/******/ 								if(v[i] > version[i]) return;
/******/ 								if(v[i] < version[i]) { i = -1; break; }
/******/ 							}
/******/ 						}
/******/ 						if(i >= 0 && version.length <= v.length) return;
/******/ 						if(scope[currentName].loaded) return warn("Ignoring providing of already used shared module: " + name);
/******/ 					}
/******/ 					scope[currentName] = { get: factory, version: version };
/******/ 				};
/******/ 				registerCurrent();
/******/ 				version.forEach((part) => {
/******/ 					currentName += "`" + part;
/******/ 					registerCurrent();
/******/ 				});
/******/ 			};
/******/ 			var initExternal = (id) => {
/******/ 				var handleError = (err) => warn("Initialization of sharing external failed: " + err);
/******/ 				try {
/******/ 					var module = __webpack_require__(id);
/******/ 					if(!module) return;
/******/ 					var initFn = (module) => module && module.init && module.init(__webpack_require__.S[name])
/******/ 					if(module.then) return promises.push(module.then(initFn, handleError));
/******/ 					var initResult = initFn(module);
/******/ 					if(initResult && initResult.then) return promises.push(initResult.catch(handleError));
/******/ 				} catch(err) { handleError(err); }
/******/ 			}
/******/ 			var promises = [];
/******/ 			switch(name) {
/******/ 				case "default": {
/******/ 					register("react", [16,13,1], () => __webpack_require__.e("node_modules_react_index_js").then(() => () => __webpack_require__(/*! react */ 6)));
/******/ 					register("date-fns", [2,14,0], () => __webpack_require__.e("vendors-node_modules_date-fns_esm_index_js").then(() => () => __webpack_require__(/*! date-fns */ 9)));
/******/ 				}
/******/ 				break;
/******/ 			}
/******/ 			return promises.length && (initPromises[name] = Promise.all(promises).then(() => initPromises[name] = 1));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/consumes */
/******/ 	(() => {
/******/ 		var ensureExistence = (scope, scopeName, key) => {
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) throw new Error("Shared module " + key + " doesn't exist in shared scope " + scopeName);
/******/ 		};
/******/ 		var invalidVersion = (version, requiredVersion) => {
/******/ 			for(var i = 0; i < requiredVersion.length; i++) {
/******/ 				if(i === version.length) return 1;
/******/ 				if(version[i] != requiredVersion[i]) { // loose equal is intentional to match string and number
/******/ 					if(typeof version[i] === "string" || typeof requiredVersion[i] === "string" || version[i] < requiredVersion[i]) return 1;
/******/ 					if(version[i] > requiredVersion[i]) return;
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		var checkSingletonVersion = (key, version, requiredVersion, strict) => {
/******/ 			if(!invalidVersion(version, requiredVersion)) return 1;
/******/ 			var msg = "Unsatisfied version of shared singleton module " + key + "@" + (version && version.join(".")) + " (required " + key + "@" + requiredVersion.join(".") + ")";
/******/ 			if(strict) throw new Error(msg);
/******/ 			typeof console !== "undefined" && console.warn && console.warn(msg);
/******/ 		};
/******/ 		var findVersion = (scope, key, requiredVersion, strict) => {
/******/ 			requiredVersion = requiredVersion || [];
/******/ 			var currentName = key;
/******/ 			var versions = requiredVersion.map((v) => currentName += "`" + v);
/******/ 			versions.unshift(key);
/******/ 			var lastVersion;
/******/ 			while(currentName = versions.shift()) {
/******/ 				if(__webpack_require__.o(scope, currentName) && !invalidVersion(lastVersion = scope[currentName].version || [], requiredVersion)) return scope[currentName];
/******/ 			}
/******/ 			var msg = "Unsatisfied version of shared module " + key + "@" + (lastVersion && lastVersion.join(".")) + " (required " + key + "@" + requiredVersion.join(".") + ")";
/******/ 			if(strict) throw new Error(msg);
/******/ 			typeof console !== "undefined" && console.warn && console.warn(msg);
/******/ 		};
/******/ 		var get = (sharedModule) => (sharedModule.loaded = 1, sharedModule.get());
/******/ 		var load = (scopeName, key) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var loadFallback = (scopeName, key, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			return scope && __webpack_require__.o(scope, key) ? get(scope[key]) : fallback();
/******/ 		};
/******/ 		var loadVersionCheck = (scopeName, key, version) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			return get(findVersion(scope, key, version) || scope[key]);
/******/ 		};
/******/ 		var loadSingletonVersionCheck = (scopeName, key, version) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			checkSingletonVersion(key, scope[key].version, version);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var loadStrictVersionCheck = (scopeName, key, version) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			return get(findVersion(scope, key, version, 1));
/******/ 		};
/******/ 		var loadStrictSingletonVersionCheck = (scopeName, key, version) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			checkSingletonVersion(key, scope[key].version, version, 1);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var loadVersionCheckFallback = (scopeName, key, version, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			return get(findVersion(scope, key, version) || scope[key]);
/******/ 		};
/******/ 		var loadSingletonVersionCheckFallback = (scopeName, key, version, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			checkSingletonVersion(key, scope[key].version, version);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var loadStrictVersionCheckFallback = (scopeName, key, version, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			var entry = scope && findVersion(scope, key, version);
/******/ 			return entry ? get(entry) : fallback();
/******/ 		};
/******/ 		var loadStrictSingletonVersionCheckFallback = (scopeName, key, version, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			checkSingletonVersion(key, scope[key].version, version, 1);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var installedModules = {};
/******/ 		var moduleToHandlerMapping = {
/******/ 			5: () => loadStrictVersionCheckFallback("default", "date-fns", ["2",12,0], () => __webpack_require__.e("vendors-node_modules_date-fns_esm_index_js").then(() => () => __webpack_require__(/*! date-fns */ 9))),
/******/ 			4: () => loadSingletonVersionCheckFallback("default", "react", ["16",8,0], () => __webpack_require__.e("node_modules_react_index_js").then(() => () => __webpack_require__(/*! react */ 6)))
/******/ 		};
/******/ 		// no consumes in initial chunks
/******/ 		var chunkMapping = {
/******/ 			"src-b_Component_js": [
/******/ 				5,
/******/ 				4
/******/ 			]
/******/ 		};
/******/ 		__webpack_require__.f.consumes = (chunkId, promises) => {
/******/ 			if(__webpack_require__.o(chunkMapping, chunkId)) {
/******/ 				chunkMapping[chunkId].forEach((id) => {
/******/ 					if(__webpack_require__.o(installedModules, id)) return promises.push(installedModules[id]);
/******/ 					var onFactory = (factory) => {
/******/ 						installedModules[id] = 0;
/******/ 						__webpack_modules__[id] = (module) => {
/******/ 							delete __webpack_module_cache__[id];
/******/ 							module.exports = factory();
/******/ 						}
/******/ 					};
/******/ 					var onError = (error) => {
/******/ 						delete installedModules[id];
/******/ 						__webpack_modules__[id] = (module) => {
/******/ 							delete __webpack_module_cache__[id];
/******/ 							throw error;
/******/ 						}
/******/ 					};
/******/ 					try {
/******/ 						var promise = moduleToHandlerMapping[id]();
/******/ 						if(promise.then) {
/******/ 							promises.push(installedModules[id] = promise.then(onFactory).catch(onError));
/******/ 						} else onFactory(promise);
/******/ 					} catch(e) { onError(e); }
/******/ 				});
/******/ 			}
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"mfeBBB": 0
/******/ 		};
/******/ 		
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => {
/******/ 								installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 							});
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId);
/******/ 						} else installedChunks[chunkId] = 0;
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
/******/ 		// no deferred startup
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 		
/******/ 			var runtime = data[3];
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonpmodule_federation_bbb"] = window["webpackJsonpmodule_federation_bbb"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })()
;
```

# dist/ccc/mfeCCC.js

```javascript
var mfeCCC;mfeCCC =
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!***********************!*\
  !*** container entry ***!
  \***********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_require__.d, __webpack_require__.o, __webpack_exports__, __webpack_require__.e, __webpack_require__, __webpack_require__.* */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var moduleMap = {
	"./Component": () => {
		return Promise.all([__webpack_require__.e("webpack_sharing_consume_default_react_react"), __webpack_require__.e("src-c_Component_js")]).then(() => () => (__webpack_require__(/*! ./src-c/Component */ 4)));
	},
	"./Component2": () => {
		return Promise.all([__webpack_require__.e("webpack_sharing_consume_default_react_react"), __webpack_require__.e("src-c_LazyComponent_js")]).then(() => () => (__webpack_require__(/*! ./src-c/LazyComponent */ 7)));
	}
};
var get = (module) => {
	return (
		__webpack_require__.o(moduleMap, module)
			? moduleMap[module]()
			: Promise.resolve().then(() => {
				throw new Error('Module "' + module + '" does not exist in container.');
			})
	);
};
var init = (shareScope) => {
	var oldScope = __webpack_require__.S["default"];
	var name = "default"
	if(oldScope && oldScope !== shareScope) throw new Error("Container initialization failed as it has already been initialized with a different share scope");
	__webpack_require__.S[name] = shareScope;
	return __webpack_require__.I(name);
};

// This exports getters to disallow modifications
__webpack_require__.d(exports, {
	get: () => get,
	init: () => init
});

/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
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
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", key);
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (event) => {
/******/ 				onScriptComplete = () => {
/******/ 		
/******/ 				}
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => fn(event));
/******/ 			}
/******/ 			;
/******/ 			var timeout = setTimeout(() => {
/******/ 				onScriptComplete({ type: 'timeout', target: script })
/******/ 			}, 120000);
/******/ 			script.onerror = script.onload = onScriptComplete;
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
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
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/ccc/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/sharing */
/******/ 	(() => {
/******/ 		__webpack_require__.S = {};
/******/ 		var initPromises = {};
/******/ 		__webpack_require__.I = (name) => {
/******/ 			// only runs once
/******/ 			if(initPromises[name]) return initPromises[name];
/******/ 			// handling circular init calls
/******/ 			initPromises[name] = 1;
/******/ 			// creates a new share scope if needed
/******/ 			if(!__webpack_require__.o(__webpack_require__.S, name)) __webpack_require__.S[name] = {};
/******/ 			// runs all init snippets from all modules reachable
/******/ 			var scope = __webpack_require__.S[name];
/******/ 			var warn = (msg) => typeof console !== "undefined" && console.warn && console.warn(msg);;
/******/ 			var register = (name, version, factory, currentName) => {
/******/ 				version = version || [];
/******/ 				currentName = name;
/******/ 				var versionConflict = () => warn("Version conflict for shared modules: " + name + " " + (v && v.join(".")) + " <=> " + (version && version.join(".")));;
/******/ 				var registerCurrent = () => {
/******/ 					if(scope[currentName]) {
/******/ 						var v = scope[currentName].version || [];
/******/ 						for(var i = 0; i < version.length && i < v.length; i++) {
/******/ 							if(v[i] != version[i]) { // loose equal is intentional to match string and number
/******/ 								if(typeof v[i] === "string" || typeof version[i] === "string") return versionConflict();
/******/ 								if(v[i] > version[i]) return;
/******/ 								if(v[i] < version[i]) { i = -1; break; }
/******/ 							}
/******/ 						}
/******/ 						if(i >= 0 && version.length <= v.length) return;
/******/ 						if(scope[currentName].loaded) return warn("Ignoring providing of already used shared module: " + name);
/******/ 					}
/******/ 					scope[currentName] = { get: factory, version: version };
/******/ 				};
/******/ 				registerCurrent();
/******/ 				version.forEach((part) => {
/******/ 					currentName += "`" + part;
/******/ 					registerCurrent();
/******/ 				});
/******/ 			};
/******/ 			var initExternal = (id) => {
/******/ 				var handleError = (err) => warn("Initialization of sharing external failed: " + err);
/******/ 				try {
/******/ 					var module = __webpack_require__(id);
/******/ 					if(!module) return;
/******/ 					var initFn = (module) => module && module.init && module.init(__webpack_require__.S[name])
/******/ 					if(module.then) return promises.push(module.then(initFn, handleError));
/******/ 					var initResult = initFn(module);
/******/ 					if(initResult && initResult.then) return promises.push(initResult.catch(handleError));
/******/ 				} catch(err) { handleError(err); }
/******/ 			}
/******/ 			var promises = [];
/******/ 			switch(name) {
/******/ 				case "default": {
/******/ 					register("react", [16,13,1], () => __webpack_require__.e("node_modules_react_index_js").then(() => () => __webpack_require__(/*! react */ 9)));
/******/ 					register("lodash", [4,17,15], () => __webpack_require__.e("vendors-node_modules_lodash_lodash_js").then(() => () => __webpack_require__(/*! lodash */ 12)));
/******/ 					register("date-fns", [2,14,0], () => __webpack_require__.e("vendors-node_modules_date-fns_esm_index_js").then(() => () => __webpack_require__(/*! date-fns */ 13)));
/******/ 				}
/******/ 				break;
/******/ 			}
/******/ 			return promises.length && (initPromises[name] = Promise.all(promises).then(() => initPromises[name] = 1));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/consumes */
/******/ 	(() => {
/******/ 		var ensureExistence = (scope, scopeName, key) => {
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) throw new Error("Shared module " + key + " doesn't exist in shared scope " + scopeName);
/******/ 		};
/******/ 		var invalidVersion = (version, requiredVersion) => {
/******/ 			for(var i = 0; i < requiredVersion.length; i++) {
/******/ 				if(i === version.length) return 1;
/******/ 				if(version[i] != requiredVersion[i]) { // loose equal is intentional to match string and number
/******/ 					if(typeof version[i] === "string" || typeof requiredVersion[i] === "string" || version[i] < requiredVersion[i]) return 1;
/******/ 					if(version[i] > requiredVersion[i]) return;
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		var checkSingletonVersion = (key, version, requiredVersion, strict) => {
/******/ 			if(!invalidVersion(version, requiredVersion)) return 1;
/******/ 			var msg = "Unsatisfied version of shared singleton module " + key + "@" + (version && version.join(".")) + " (required " + key + "@" + requiredVersion.join(".") + ")";
/******/ 			if(strict) throw new Error(msg);
/******/ 			typeof console !== "undefined" && console.warn && console.warn(msg);
/******/ 		};
/******/ 		var findVersion = (scope, key, requiredVersion, strict) => {
/******/ 			requiredVersion = requiredVersion || [];
/******/ 			var currentName = key;
/******/ 			var versions = requiredVersion.map((v) => currentName += "`" + v);
/******/ 			versions.unshift(key);
/******/ 			var lastVersion;
/******/ 			while(currentName = versions.shift()) {
/******/ 				if(__webpack_require__.o(scope, currentName) && !invalidVersion(lastVersion = scope[currentName].version || [], requiredVersion)) return scope[currentName];
/******/ 			}
/******/ 			var msg = "Unsatisfied version of shared module " + key + "@" + (lastVersion && lastVersion.join(".")) + " (required " + key + "@" + requiredVersion.join(".") + ")";
/******/ 			if(strict) throw new Error(msg);
/******/ 			typeof console !== "undefined" && console.warn && console.warn(msg);
/******/ 		};
/******/ 		var get = (sharedModule) => (sharedModule.loaded = 1, sharedModule.get());
/******/ 		var load = (scopeName, key) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var loadFallback = (scopeName, key, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			return scope && __webpack_require__.o(scope, key) ? get(scope[key]) : fallback();
/******/ 		};
/******/ 		var loadVersionCheck = (scopeName, key, version) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			return get(findVersion(scope, key, version) || scope[key]);
/******/ 		};
/******/ 		var loadSingletonVersionCheck = (scopeName, key, version) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			checkSingletonVersion(key, scope[key].version, version);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var loadStrictVersionCheck = (scopeName, key, version) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			return get(findVersion(scope, key, version, 1));
/******/ 		};
/******/ 		var loadStrictSingletonVersionCheck = (scopeName, key, version) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			ensureExistence(scope, scopeName, key);
/******/ 			checkSingletonVersion(key, scope[key].version, version, 1);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var loadVersionCheckFallback = (scopeName, key, version, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			return get(findVersion(scope, key, version) || scope[key]);
/******/ 		};
/******/ 		var loadSingletonVersionCheckFallback = (scopeName, key, version, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			checkSingletonVersion(key, scope[key].version, version);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var loadStrictVersionCheckFallback = (scopeName, key, version, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			var entry = scope && findVersion(scope, key, version);
/******/ 			return entry ? get(entry) : fallback();
/******/ 		};
/******/ 		var loadStrictSingletonVersionCheckFallback = (scopeName, key, version, fallback) => {
/******/ 			__webpack_require__.I(scopeName);
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			checkSingletonVersion(key, scope[key].version, version, 1);
/******/ 			return get(scope[key]);
/******/ 		};
/******/ 		var installedModules = {};
/******/ 		var moduleToHandlerMapping = {
/******/ 			5: () => loadSingletonVersionCheckFallback("default", "react", ["16",8,0], () => __webpack_require__.e("node_modules_react_index_js").then(() => () => __webpack_require__(/*! react */ 9))),
/******/ 			6: () => loadStrictVersionCheckFallback("default", "date-fns", ["2",12,0], () => __webpack_require__.e("vendors-node_modules_date-fns_esm_index_js").then(() => () => __webpack_require__(/*! date-fns */ 13))),
/******/ 			8: () => loadStrictVersionCheckFallback("default", "lodash", ["4",17,4], () => __webpack_require__.e("vendors-node_modules_lodash_lodash_js").then(() => () => __webpack_require__(/*! lodash */ 12)))
/******/ 		};
/******/ 		// no consumes in initial chunks
/******/ 		var chunkMapping = {
/******/ 			"webpack_sharing_consume_default_react_react": [
/******/ 				5
/******/ 			],
/******/ 			"src-c_Component_js": [
/******/ 				6
/******/ 			],
/******/ 			"src-c_LazyComponent_js": [
/******/ 				8
/******/ 			]
/******/ 		};
/******/ 		__webpack_require__.f.consumes = (chunkId, promises) => {
/******/ 			if(__webpack_require__.o(chunkMapping, chunkId)) {
/******/ 				chunkMapping[chunkId].forEach((id) => {
/******/ 					if(__webpack_require__.o(installedModules, id)) return promises.push(installedModules[id]);
/******/ 					var onFactory = (factory) => {
/******/ 						installedModules[id] = 0;
/******/ 						__webpack_modules__[id] = (module) => {
/******/ 							delete __webpack_module_cache__[id];
/******/ 							module.exports = factory();
/******/ 						}
/******/ 					};
/******/ 					var onError = (error) => {
/******/ 						delete installedModules[id];
/******/ 						__webpack_modules__[id] = (module) => {
/******/ 							delete __webpack_module_cache__[id];
/******/ 							throw error;
/******/ 						}
/******/ 					};
/******/ 					try {
/******/ 						var promise = moduleToHandlerMapping[id]();
/******/ 						if(promise.then) {
/******/ 							promises.push(installedModules[id] = promise.then(onFactory).catch(onError));
/******/ 						} else onFactory(promise);
/******/ 					} catch(e) { onError(e); }
/******/ 				});
/******/ 			}
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"mfeCCC": 0
/******/ 		};
/******/ 		
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if("webpack_sharing_consume_default_react_react" != chunkId) {
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => {
/******/ 								installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 							});
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId);
/******/ 						} else installedChunks[chunkId] = 0;
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
/******/ 		// no deferred startup
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 		
/******/ 			var runtime = data[3];
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonpmodule_federation_ccc"] = window["webpackJsonpmodule_federation_ccc"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.17
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                    Asset      Size
                                   app.js  26.4 KiB  [emitted]  [name: app]
    node_modules_react_index_js-_11190.js  12.6 KiB  [emitted]
    node_modules_react_index_js-_11191.js  10.2 KiB  [emitted]
                      src_bootstrap_js.js   157 KiB  [emitted]
    Entrypoint app = app.js
    chunk app.js (app) 669 bytes (javascript) 42 bytes (share-init) 16 KiB (runtime) [entry] [rendered]
        > ./src/index.js app
     ./src/index.js 585 bytes [built]
     external "mfeBBB@/dist/bbb/mfeBBB.js" 42 bytes [built]
     external "mfeCCC@/dist/ccc/mfeCCC.js" 42 bytes [built]
     provide module (default) react@16.13.1 = react 42 bytes [built]
         + 13 hidden root modules
    chunk node_modules_react_index_js-_11190.js 8.76 KiB [rendered]
        > provide module (default) react@16.13.1 = react
     ../../node_modules/react/index.js 190 bytes [built]
         + 2 hidden dependent modules
    chunk node_modules_react_index_js-_11191.js 6.7 KiB [rendered]
        > shared module (default) react@^16.8.0 (singleton) -> react
     ../../node_modules/react/index.js 190 bytes [built]
         + 1 hidden dependent module
    chunk src_bootstrap_js.js 142 KiB (javascript) 42 bytes (consume-shared) 12 bytes (remote) 12 bytes (share-init) [rendered]
        > ./bootstrap ./src/index.js 8:0-21
     ./src/bootstrap.js 382 bytes [built]
         + 19 hidden dependent modules
    chunk 6 bytes (remote) 6 bytes (share-init)
        > mfe-c/Component2 ./src/App.js 8:49-75
     remote mfe-c/Component2 6 bytes (remote) 6 bytes (share-init) [built]
Child mfe-b:
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                            Asset      Size
                                        mfeBBB.js  21.7 KiB  [emitted]  [name: mfeBBB]
                   node_modules_react_index_js.js  12.6 KiB  [emitted]
                            src-b_Component_js.js  2.26 KiB  [emitted]
    vendors-node_modules_date-fns_esm_index_js.js   797 KiB  [emitted]  [id hint: vendors]
    Entrypoint mfeBBB = mfeBBB.js
    chunk mfeBBB.js (mfeBBB) 42 bytes (javascript) 84 bytes (share-init) 13.9 KiB (runtime) [entry] [rendered]
        > mfeBBB
     container entry 42 bytes [built]
     provide module (default) date-fns@2.14.0 = date-fns 42 bytes [built]
     provide module (default) react@16.13.1 = react 42 bytes [built]
         + 11 hidden root modules
    chunk node_modules_react_index_js.js 8.76 KiB [rendered]
        > provide module (default) react@16.13.1 = react
        > shared module (default) react@^16.8.0 (singleton) -> react
     ../../node_modules/react/index.js 190 bytes [built]
         + 2 hidden dependent modules
    chunk src-b_Component_js.js 753 bytes (javascript) 84 bytes (consume-shared) [rendered]
        > ./src-b/Component container entry ./Component
     ./src-b/Component.js 753 bytes [built]
         + 2 hidden dependent modules
    chunk vendors-node_modules_date-fns_esm_index_js.js (id hint: vendors) 486 KiB [rendered] reused as split chunk (cache group: defaultVendors)
        > provide module (default) date-fns@2.14.0 = date-fns
        > shared module (default) date-fns@^2.12.0 (strict) -> date-fns
     ../../node_modules/date-fns/esm/index.js 13.1 KiB [built]
         + 230 hidden dependent modules
Child mfe-c:
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                            Asset      Size
                                        mfeCCC.js  23.3 KiB  [emitted]  [name: mfeCCC]
                   node_modules_react_index_js.js  12.6 KiB  [emitted]
                            src-c_Component_js.js  1.99 KiB  [emitted]
                        src-c_LazyComponent_js.js  2.04 KiB  [emitted]
    vendors-node_modules_date-fns_esm_index_js.js   797 KiB  [emitted]  [id hint: vendors]
         vendors-node_modules_lodash_lodash_js.js   529 KiB  [emitted]  [id hint: vendors]
    Entrypoint mfeCCC = mfeCCC.js
    chunk mfeCCC.js (mfeCCC) 42 bytes (javascript) 126 bytes (share-init) 14.7 KiB (runtime) [entry] [rendered]
        > mfeCCC
     container entry 42 bytes [built]
     provide module (default) date-fns@2.14.0 = date-fns 42 bytes [built]
     provide module (default) lodash@4.17.15 = lodash 42 bytes [built]
     provide module (default) react@16.13.1 = react 42 bytes [built]
         + 13 hidden root modules
    chunk node_modules_react_index_js.js 8.76 KiB [rendered]
        > provide module (default) react@16.13.1 = react
        > shared module (default) react@^16.8.0 (singleton) -> react
     ../../node_modules/react/index.js 190 bytes [built]
         + 2 hidden dependent modules
    chunk src-c_Component_js.js 469 bytes (javascript) 42 bytes (consume-shared) [rendered]
        > ./src-c/Component container entry ./Component
     ./src-c/Component.js 469 bytes [built]
         + 1 hidden dependent module
    chunk src-c_LazyComponent_js.js 503 bytes (javascript) 42 bytes (consume-shared) [rendered]
        > ./src-c/LazyComponent container entry ./Component2
     ./src-c/LazyComponent.js 503 bytes [built]
         + 1 hidden dependent module
    chunk vendors-node_modules_date-fns_esm_index_js.js (id hint: vendors) 486 KiB [rendered] reused as split chunk (cache group: defaultVendors)
        > provide module (default) date-fns@2.14.0 = date-fns
        > shared module (default) date-fns@^2.12.0 (strict) -> date-fns
     ../../node_modules/date-fns/esm/index.js 13.1 KiB [built]
         + 230 hidden dependent modules
    chunk vendors-node_modules_lodash_lodash_js.js (id hint: vendors) 528 KiB [rendered] reused as split chunk (cache group: defaultVendors)
        > provide module (default) lodash@4.17.15 = lodash
        > shared module (default) lodash@^4.17.4 (strict) -> lodash
     ../../node_modules/lodash/lodash.js 528 KiB [built]
    chunk 42 bytes split chunk (cache group: default)
        > ./src-c/Component container entry ./Component
        > ./src-c/LazyComponent container entry ./Component2
     shared module (default) react@^16.8.0 (singleton) -> react 42 bytes [built]
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.17
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                                Asset       Size
                                               app.js   5.72 KiB  [emitted]  [name: app]
                node_modules_react_index_js-_11190.js   7.26 KiB  [emitted]
    node_modules_react_index_js-_11190.js.LICENSE.txt  295 bytes  [emitted]
                node_modules_react_index_js-_11191.js   6.31 KiB  [emitted]
    node_modules_react_index_js-_11191.js.LICENSE.txt  243 bytes  [emitted]
                                  src_bootstrap_js.js    129 KiB  [emitted]
                      src_bootstrap_js.js.LICENSE.txt  546 bytes  [emitted]
    Entrypoint app = app.js
    chunk app.js (app) 669 bytes (javascript) 42 bytes (share-init) 16 KiB (runtime) [entry] [rendered]
        > ./src/index.js app
     ./src/index.js 585 bytes [built]
     external "mfeBBB@/dist/bbb/mfeBBB.js" 42 bytes [built]
     external "mfeCCC@/dist/ccc/mfeCCC.js" 42 bytes [built]
     provide module (default) react@16.13.1 = react 42 bytes [built]
         + 13 hidden root modules
    chunk node_modules_react_index_js-_11190.js 8.76 KiB [rendered]
        > provide module (default) react@16.13.1 = react
     ../../node_modules/react/index.js 190 bytes [built]
         + 2 hidden dependent modules
    chunk node_modules_react_index_js-_11191.js 6.7 KiB [rendered]
        > shared module (default) react@^16.8.0 (singleton) -> react
     ../../node_modules/react/index.js 190 bytes [built]
         + 1 hidden dependent module
    chunk src_bootstrap_js.js 142 KiB (javascript) 42 bytes (consume-shared) 12 bytes (remote) 12 bytes (share-init) [rendered]
        > ./bootstrap ./src/index.js 8:0-21
     ./src/bootstrap.js + 7 modules 14 KiB [built]
         + 12 hidden dependent modules
    chunk 6 bytes (remote) 6 bytes (share-init)
        > mfe-c/Component2 ./src/App.js 8:49-75
     remote mfe-c/Component2 6 bytes (remote) 6 bytes (share-init) [built]
Child mfe-b:
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                            Asset       Size
                                        mfeBBB.js   4.73 KiB  [emitted]  [name: mfeBBB]
                   node_modules_react_index_js.js   7.21 KiB  [emitted]
       node_modules_react_index_js.js.LICENSE.txt  295 bytes  [emitted]
                            src-b_Component_js.js  493 bytes  [emitted]
    vendors-node_modules_date-fns_esm_index_js.js   77.4 KiB  [emitted]  [id hint: vendors]
    Entrypoint mfeBBB = mfeBBB.js
    chunk mfeBBB.js (mfeBBB) 42 bytes (javascript) 84 bytes (share-init) 13.9 KiB (runtime) [entry] [rendered]
        > mfeBBB
     container entry 42 bytes [built]
     provide module (default) date-fns@2.14.0 = date-fns 42 bytes [built]
     provide module (default) react@16.13.1 = react 42 bytes [built]
         + 11 hidden root modules
    chunk node_modules_react_index_js.js 8.76 KiB [rendered]
        > shared module (default) react@^16.8.0 (singleton) -> react
        > provide module (default) react@16.13.1 = react
     ../../node_modules/react/index.js 190 bytes [built]
         + 2 hidden dependent modules
    chunk src-b_Component_js.js 753 bytes (javascript) 84 bytes (consume-shared) [rendered]
        > ./src-b/Component container entry ./Component
     ./src-b/Component.js 753 bytes [built]
         + 2 hidden dependent modules
    chunk vendors-node_modules_date-fns_esm_index_js.js (id hint: vendors) 486 KiB [rendered] reused as split chunk (cache group: defaultVendors)
        > shared module (default) date-fns@^2.12.0 (strict) -> date-fns
        > provide module (default) date-fns@2.14.0 = date-fns
     ../../node_modules/date-fns/esm/index.js + 230 modules 486 KiB [built]
Child mfe-c:
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                                   Asset       Size
                                               mfeCCC.js   5.52 KiB  [emitted]  [name: mfeCCC]
                          node_modules_react_index_js.js   7.21 KiB  [emitted]
              node_modules_react_index_js.js.LICENSE.txt  295 bytes  [emitted]
                                   src-c_Component_js.js  493 bytes  [emitted]
                               src-c_LazyComponent_js.js  537 bytes  [emitted]
           vendors-node_modules_date-fns_esm_index_js.js   77.4 KiB  [emitted]  [id hint: vendors]
                vendors-node_modules_lodash_lodash_js.js   70.1 KiB  [emitted]  [id hint: vendors]
    vendors-node_modules_lodash_lodash_js.js.LICENSE.txt  336 bytes  [emitted]
    Entrypoint mfeCCC = mfeCCC.js
    chunk mfeCCC.js (mfeCCC) 42 bytes (javascript) 126 bytes (share-init) 14.7 KiB (runtime) [entry] [rendered]
        > mfeCCC
     container entry 42 bytes [built]
     provide module (default) date-fns@2.14.0 = date-fns 42 bytes [built]
     provide module (default) lodash@4.17.15 = lodash 42 bytes [built]
     provide module (default) react@16.13.1 = react 42 bytes [built]
         + 13 hidden root modules
    chunk node_modules_react_index_js.js 8.76 KiB [rendered]
        > shared module (default) react@^16.8.0 (singleton) -> react
        > provide module (default) react@16.13.1 = react
     ../../node_modules/react/index.js 190 bytes [built]
         + 2 hidden dependent modules
    chunk src-c_Component_js.js 469 bytes (javascript) 42 bytes (consume-shared) [rendered]
        > ./src-c/Component container entry ./Component
     ./src-c/Component.js 469 bytes [built]
         + 1 hidden dependent module
    chunk src-c_LazyComponent_js.js 503 bytes (javascript) 42 bytes (consume-shared) [rendered]
        > ./src-c/LazyComponent container entry ./Component2
     ./src-c/LazyComponent.js 503 bytes [built]
         + 1 hidden dependent module
    chunk vendors-node_modules_date-fns_esm_index_js.js (id hint: vendors) 486 KiB [rendered] reused as split chunk (cache group: defaultVendors)
        > shared module (default) date-fns@^2.12.0 (strict) -> date-fns
        > provide module (default) date-fns@2.14.0 = date-fns
     ../../node_modules/date-fns/esm/index.js + 230 modules 486 KiB [built]
    chunk vendors-node_modules_lodash_lodash_js.js (id hint: vendors) 528 KiB [rendered] reused as split chunk (cache group: defaultVendors)
        > provide module (default) lodash@4.17.15 = lodash
        > shared module (default) lodash@^4.17.4 (strict) -> lodash
     ../../node_modules/lodash/lodash.js 528 KiB [built]
    chunk 42 bytes split chunk (cache group: default)
        > ./src-c/Component container entry ./Component
        > ./src-c/LazyComponent container entry ./Component2
     shared module (default) react@^16.8.0 (singleton) -> react 42 bytes [built]
```
