# webpack.config.js

```javascript
const path = require("path");
const { ModuleFederationPlugin } = require("../../").container;
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
	// For this example we have 3 configs in a single file
	// In practice you probably would have separate config
	// maybe even separate repos for each build.
	// For Module Federation there is not compile-time dependency
	// between the builds.
	// Each one can have different config options.
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

				// list of shared modules with optional options
				shared: {
					// specifying a module request as shared module
					// will provide all used modules matching this name (version from package.json)
					// and consume shared modules in the version specified in dependencies from package.json
					// (or in dev/peer/optionalDependencies)
					// So it use the highest available version of this package matching the version requirement
					// from package.json, while providing it's own version to others.
					react: {
						singleton: true // make sure only a single react module is used
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

				// list of shared modules
				shared: [
					// date-fns is shared with the other remote, app doesn't know about that
					"date-fns",
					{
						react: {
							singleton: true // must be specified in each config
						}
					}
				]
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

				shared: [
					// All (used) requests within lodash are shared.
					"lodash/",
					"date-fns",
					{
						react: {
							// Do not load our own version.
							// There must be a valid shared module available at runtime.
							// This improves build time as this module doesn't need to be compiled,
							// but it opts-out of possible fallbacks and runtime version upgrade.
							import: false,
							singleton: true
						}
					}
				]
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
		<!-- It will load all other scripts if necessary -->
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

/***/ 12:
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

/***/ 14:
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
/******/ 		var dataWebpackPrefix = "module-federation-aaa:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
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
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
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
/******/ 				script.parentNode && script.parentNode.removeChild(script);
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
/******/ 				11,
/******/ 				13
/******/ 			],
/******/ 			"webpack_container_remote_mfe-c_Component2": [
/******/ 				27
/******/ 			]
/******/ 		};
/******/ 		var idToExternalAndNameMapping = {
/******/ 			"11": [
/******/ 				"default",
/******/ 				"./Component",
/******/ 				12
/******/ 			],
/******/ 			"13": [
/******/ 				"default",
/******/ 				"./Component",
/******/ 				14
/******/ 			],
/******/ 			"27": [
/******/ 				"default",
/******/ 				"./Component2",
/******/ 				14
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
/******/ 			var uniqueName = "module-federation-aaa";
/******/ 			var register = (name, version, factory) => {
/******/ 				var versions = scope[name] = scope[name] || {};
/******/ 				var activeVersion = versions[version];
/******/ 				if(!activeVersion || uniqueName > activeVersion.from) versions[version] = { get: factory, from: uniqueName };
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
/******/ 					register("react", "16.13.1", () => __webpack_require__.e("node_modules_react_index_js-_11190").then(() => () => __webpack_require__(/*! ../../node_modules/react/index.js */ 25)));
/******/ 					initExternal(12);
/******/ 					initExternal(14);
/******/ 				}
/******/ 				break;
/******/ 			}
/******/ 			return promises.length && (initPromises[name] = Promise.all(promises).then(() => initPromises[name] = 1));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/consumes */
/******/ 	(() => {
/******/ 		var parseVersion = (str) => {
/******/ 			var convertNumber = (str) => +str == str ? +str : str;;
/******/ 			var splitAndConvert = (str) => str.split(".").map(convertNumber);;
/******/ 			// see webpack/lib/util/semver.js for original code
/******/ 			var n=/^([^-+]+)?(?:-([^+]+))?(?:\+(.+))?$/.exec(str),p=n[1]?splitAndConvert(n[1]):[];return n[2]&&(p.length++,p.push.apply(p,splitAndConvert(n[2]))),n[3]&&(p.push([]),p.push.apply(p,splitAndConvert(n[3]))),p
/******/ 		}
/******/ 		var versionLt = (a, b) => {
/******/ 			// see webpack/lib/util/semver.js for original code
/******/ 			for(var r=0;;){if(r>=a.length)return r<b.length&&"u"!=(typeof b[r])[0];var t=a[r],e=(typeof t)[0];if(r>=b.length)return"u"==e;var n=b[r],f=(typeof n)[0];if(e!=f)return"o"==e&&"n"==f||("s"==f||"u"==e);if("o"!=e&&"u"!=e&&t!=n)return t<n;r++}
/******/ 		}
/******/ 		var rangeToString = (range) => {
/******/ 			// see webpack/lib/util/semver.js for original code
/******/ 			if(1===range.length)return"*";if(0 in range){var r="",n=range[0];r+=0==n?">=":-1==n?"<":1==n?"^":2==n?"~":n>0?"=":"!=";for(var e=1,a=1;a<range.length;a++){e--,r+="u"==(typeof(t=range[a]))[0]?"-":(e>0?".":"")+(e=2,t)}return r}var g=[];for(a=1;a<range.length;a++){var t=range[a];g.push(0===t?"not("+o()+")":1===t?"("+o()+" || "+o()+")":2===t?g.pop()+" "+g.pop():rangeToString(t))}return o();function o(){return g.pop().replace(/^\((.+)\)$/,"$1")}
/******/ 		}
/******/ 		var satisfy = (range, version) => {
/******/ 			// see webpack/lib/util/semver.js for original code
/******/ 			if(0 in range){version=parseVersion(version);var e=range[0],r=e<0;r&&(e=-e-1);for(var n=0,i=1,f=!0;;i++,n++){var a,s,t=i<range.length?(typeof range[i])[0]:"";if(n>=version.length||"o"==(s=(typeof(a=version[n]))[0]))return!f||("u"==t?i>e&&!r:""==t!=r);if("u"==s){if(!f||"u"!=t)return!1}else if(f)if(t==s)if(i<=e){if(a!=range[i])return!1}else{if(r?a>range[i]:a<range[i])return!1;a!=range[i]&&(f=!1)}else if("s"!=t&&"n"!=t){if(r||i<=e)return!1;f=!1,i--}else{if(i<=e||s<t!=r)return!1;f=!1}else"s"!=t&&"n"!=t&&(f=!1,i--)}}var g=[],o=g.pop.bind(g);for(n=1;n<range.length;n++){var u=range[n];g.push(1==u?o()|o():2==u?o()&o():u?satisfy(u,version):!o())}return!!o()
/******/ 		}
/******/ 		var ensureExistence = (scopeName, key) => {
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) throw new Error("Shared module " + key + " doesn't exist in shared scope " + scopeName);
/******/ 			return scope;
/******/ 		};
/******/ 		var findVersion = (scope, key) => {
/******/ 			var versions = scope[key];
/******/ 			var key = Object.keys(versions).reduce((a, b) => {
/******/ 				return !a || versionLt(a, b) ? b : a;
/******/ 			}, 0);
/******/ 			return key && versions[key]
/******/ 		};
/******/ 		var findSingletonVersionKey = (scope, key) => {
/******/ 			var versions = scope[key];
/******/ 			return Object.keys(versions).reduce((a, b) => {
/******/ 				return !a || (!versions[a].loaded && versionLt(a, b)) ? b : a;
/******/ 			}, 0);
/******/ 		};
/******/ 		var getInvalidSingletonVersionMessage = (key, version, requiredVersion) => {
/******/ 			return "Unsatisfied version " + version + " of shared singleton module " + key + " (required " + rangeToString(requiredVersion) + ")"
/******/ 		};
/******/ 		var getSingletonVersion = (scope, scopeName, key, requiredVersion) => {
/******/ 			var version = findSingletonVersionKey(scope, key);
/******/ 			if (!satisfy(requiredVersion, version)) typeof console !== "undefined" && console.warn && console.warn(getInvalidSingletonVersionMessage(key, version, requiredVersion));
/******/ 			return get(scope[key][version]);
/******/ 		};
/******/ 		var getStrictSingletonVersion = (scope, scopeName, key, requiredVersion) => {
/******/ 			var version = findSingletonVersionKey(scope, key);
/******/ 			if (!satisfy(requiredVersion, version)) throw new Error(getInvalidSingletonVersionMessage(key, version, requiredVersion));
/******/ 			return get(scope[key][version]);
/******/ 		};
/******/ 		var findValidVersion = (scope, key, requiredVersion) => {
/******/ 			var versions = scope[key];
/******/ 			var key = Object.keys(versions).reduce((a, b) => {
/******/ 				if (!satisfy(requiredVersion, b)) return a;
/******/ 				return !a || versionLt(a, b) ? b : a;
/******/ 			}, 0);
/******/ 			return key && versions[key]
/******/ 		};
/******/ 		var getInvalidVersionMessage = (scope, scopeName, key, requiredVersion) => {
/******/ 			var versions = scope[key];
/******/ 			return "No satisfying version (" + rangeToString(requiredVersion) + ") of shared module " + key + " found in shared scope " + scopeName + ".\n" +
/******/ 				"Available versions: " + Object.keys(versions).map((key) => {
/******/ 				return key + " from " + versions[key].from;
/******/ 			}).join(", ");
/******/ 		};
/******/ 		var getValidVersion = (scope, scopeName, key, requiredVersion) => {
/******/ 			var entry = findValidVersion(scope, key, requiredVersion);
/******/ 			if(entry) return get(entry);
/******/ 			throw new Error(getInvalidVersionMessage(scope, scopeName, key, requiredVersion));
/******/ 		};
/******/ 		var warnInvalidVersion = (scope, scopeName, key, requiredVersion) => {
/******/ 			typeof console !== "undefined" && console.warn && console.warn(getInvalidVersionMessage(scope, scopeName, key, requiredVersion));
/******/ 		};
/******/ 		var get = (entry) => {
/******/ 			entry.loaded = 1;
/******/ 			return entry.get()
/******/ 		};
/******/ 		var init = (fn) => function(scopeName, a, b, c) {
/******/ 			var promise = __webpack_require__.I(scopeName);
/******/ 			if (promise.then) return promise.then(fn.bind(fn, scopeName, __webpack_require__.S[scopeName], a, b, c));
/******/ 			return fn(scopeName, __webpack_require__.S[scopeName], a, b, c);
/******/ 		};
/******/ 		
/******/ 		var load = /*#__PURE__*/ init((scopeName, scope, key) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return get(findVersion(scope, key));
/******/ 		});
/******/ 		var loadFallback = /*#__PURE__*/ init((scopeName, scope, key, fallback) => {
/******/ 			return scope && __webpack_require__.o(scope, key) ? get(findVersion(scope, key)) : fallback();
/******/ 		});
/******/ 		var loadVersionCheck = /*#__PURE__*/ init((scopeName, scope, key, version) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return get(findValidVersion(scope, key, version) || warnInvalidVersion(scope, scopeName, key, version) || findVersion(scope, key));
/******/ 		});
/******/ 		var loadSingletonVersionCheck = /*#__PURE__*/ init((scopeName, scope, key, version) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return getSingletonVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var loadStrictVersionCheck = /*#__PURE__*/ init((scopeName, scope, key, version) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return getValidVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var loadStrictSingletonVersionCheck = /*#__PURE__*/ init((scopeName, scope, key, version) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return getStrictSingletonVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var loadVersionCheckFallback = /*#__PURE__*/ init((scopeName, scope, key, version, fallback) => {
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			return get(findValidVersion(scope, key, version) || warnInvalidVersion(scope, scopeName, key, version) || findVersion(scope, key));
/******/ 		});
/******/ 		var loadSingletonVersionCheckFallback = /*#__PURE__*/ init((scopeName, scope, key, version, fallback) => {
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			return getSingletonVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var loadStrictVersionCheckFallback = /*#__PURE__*/ init((scopeName, scope, key, version, fallback) => {
/******/ 			var entry = scope && __webpack_require__.o(scope, key) && findValidVersion(scope, key, version);
/******/ 			return entry ? get(entry) : fallback();
/******/ 		});
/******/ 		var loadStrictSingletonVersionCheckFallback = /*#__PURE__*/ init((scopeName, scope, key, version, fallback) => {
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			return getStrictSingletonVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var installedModules = {};
/******/ 		var moduleToHandlerMapping = {
/******/ 			5: () => loadSingletonVersionCheckFallback("default", "react", [1,16,13,1], () => __webpack_require__.e("node_modules_react_index_js-_11191").then(() => () => __webpack_require__(/*! react */ 25))),
/******/ 			9: () => loadSingletonVersionCheckFallback("default", "react", [1,16,8,0], () => __webpack_require__.e("node_modules_react_index_js-_11191").then(() => () => __webpack_require__(/*! react */ 25)))
/******/ 		};
/******/ 		// no consumes in initial chunks
/******/ 		var chunkMapping = {
/******/ 			"src_bootstrap_js": [
/******/ 				5,
/******/ 				9
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
/******/ 		var dataWebpackPrefix = "module-federation-bbb:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
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
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
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
/******/ 				script.parentNode && script.parentNode.removeChild(script);
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
/******/ 			var uniqueName = "module-federation-bbb";
/******/ 			var register = (name, version, factory) => {
/******/ 				var versions = scope[name] = scope[name] || {};
/******/ 				var activeVersion = versions[version];
/******/ 				if(!activeVersion || uniqueName > activeVersion.from) versions[version] = { get: factory, from: uniqueName };
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
/******/ 					register("date-fns", "2.14.0", () => __webpack_require__.e("vendors-node_modules_date-fns_esm_index_js").then(() => () => __webpack_require__(/*! ../../node_modules/date-fns/esm/index.js */ 6)));
/******/ 					register("react", "16.13.1", () => __webpack_require__.e("node_modules_react_index_js").then(() => () => __webpack_require__(/*! ../../node_modules/react/index.js */ 237)));
/******/ 				}
/******/ 				break;
/******/ 			}
/******/ 			return promises.length && (initPromises[name] = Promise.all(promises).then(() => initPromises[name] = 1));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/consumes */
/******/ 	(() => {
/******/ 		var parseVersion = (str) => {
/******/ 			var convertNumber = (str) => +str == str ? +str : str;;
/******/ 			var splitAndConvert = (str) => str.split(".").map(convertNumber);;
/******/ 			// see webpack/lib/util/semver.js for original code
/******/ 			var n=/^([^-+]+)?(?:-([^+]+))?(?:\+(.+))?$/.exec(str),p=n[1]?splitAndConvert(n[1]):[];return n[2]&&(p.length++,p.push.apply(p,splitAndConvert(n[2]))),n[3]&&(p.push([]),p.push.apply(p,splitAndConvert(n[3]))),p
/******/ 		}
/******/ 		var versionLt = (a, b) => {
/******/ 			// see webpack/lib/util/semver.js for original code
/******/ 			for(var r=0;;){if(r>=a.length)return r<b.length&&"u"!=(typeof b[r])[0];var t=a[r],e=(typeof t)[0];if(r>=b.length)return"u"==e;var n=b[r],f=(typeof n)[0];if(e!=f)return"o"==e&&"n"==f||("s"==f||"u"==e);if("o"!=e&&"u"!=e&&t!=n)return t<n;r++}
/******/ 		}
/******/ 		var rangeToString = (range) => {
/******/ 			// see webpack/lib/util/semver.js for original code
/******/ 			if(1===range.length)return"*";if(0 in range){var r="",n=range[0];r+=0==n?">=":-1==n?"<":1==n?"^":2==n?"~":n>0?"=":"!=";for(var e=1,a=1;a<range.length;a++){e--,r+="u"==(typeof(t=range[a]))[0]?"-":(e>0?".":"")+(e=2,t)}return r}var g=[];for(a=1;a<range.length;a++){var t=range[a];g.push(0===t?"not("+o()+")":1===t?"("+o()+" || "+o()+")":2===t?g.pop()+" "+g.pop():rangeToString(t))}return o();function o(){return g.pop().replace(/^\((.+)\)$/,"$1")}
/******/ 		}
/******/ 		var satisfy = (range, version) => {
/******/ 			// see webpack/lib/util/semver.js for original code
/******/ 			if(0 in range){version=parseVersion(version);var e=range[0],r=e<0;r&&(e=-e-1);for(var n=0,i=1,f=!0;;i++,n++){var a,s,t=i<range.length?(typeof range[i])[0]:"";if(n>=version.length||"o"==(s=(typeof(a=version[n]))[0]))return!f||("u"==t?i>e&&!r:""==t!=r);if("u"==s){if(!f||"u"!=t)return!1}else if(f)if(t==s)if(i<=e){if(a!=range[i])return!1}else{if(r?a>range[i]:a<range[i])return!1;a!=range[i]&&(f=!1)}else if("s"!=t&&"n"!=t){if(r||i<=e)return!1;f=!1,i--}else{if(i<=e||s<t!=r)return!1;f=!1}else"s"!=t&&"n"!=t&&(f=!1,i--)}}var g=[],o=g.pop.bind(g);for(n=1;n<range.length;n++){var u=range[n];g.push(1==u?o()|o():2==u?o()&o():u?satisfy(u,version):!o())}return!!o()
/******/ 		}
/******/ 		var ensureExistence = (scopeName, key) => {
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) throw new Error("Shared module " + key + " doesn't exist in shared scope " + scopeName);
/******/ 			return scope;
/******/ 		};
/******/ 		var findVersion = (scope, key) => {
/******/ 			var versions = scope[key];
/******/ 			var key = Object.keys(versions).reduce((a, b) => {
/******/ 				return !a || versionLt(a, b) ? b : a;
/******/ 			}, 0);
/******/ 			return key && versions[key]
/******/ 		};
/******/ 		var findSingletonVersionKey = (scope, key) => {
/******/ 			var versions = scope[key];
/******/ 			return Object.keys(versions).reduce((a, b) => {
/******/ 				return !a || (!versions[a].loaded && versionLt(a, b)) ? b : a;
/******/ 			}, 0);
/******/ 		};
/******/ 		var getInvalidSingletonVersionMessage = (key, version, requiredVersion) => {
/******/ 			return "Unsatisfied version " + version + " of shared singleton module " + key + " (required " + rangeToString(requiredVersion) + ")"
/******/ 		};
/******/ 		var getSingletonVersion = (scope, scopeName, key, requiredVersion) => {
/******/ 			var version = findSingletonVersionKey(scope, key);
/******/ 			if (!satisfy(requiredVersion, version)) typeof console !== "undefined" && console.warn && console.warn(getInvalidSingletonVersionMessage(key, version, requiredVersion));
/******/ 			return get(scope[key][version]);
/******/ 		};
/******/ 		var getStrictSingletonVersion = (scope, scopeName, key, requiredVersion) => {
/******/ 			var version = findSingletonVersionKey(scope, key);
/******/ 			if (!satisfy(requiredVersion, version)) throw new Error(getInvalidSingletonVersionMessage(key, version, requiredVersion));
/******/ 			return get(scope[key][version]);
/******/ 		};
/******/ 		var findValidVersion = (scope, key, requiredVersion) => {
/******/ 			var versions = scope[key];
/******/ 			var key = Object.keys(versions).reduce((a, b) => {
/******/ 				if (!satisfy(requiredVersion, b)) return a;
/******/ 				return !a || versionLt(a, b) ? b : a;
/******/ 			}, 0);
/******/ 			return key && versions[key]
/******/ 		};
/******/ 		var getInvalidVersionMessage = (scope, scopeName, key, requiredVersion) => {
/******/ 			var versions = scope[key];
/******/ 			return "No satisfying version (" + rangeToString(requiredVersion) + ") of shared module " + key + " found in shared scope " + scopeName + ".\n" +
/******/ 				"Available versions: " + Object.keys(versions).map((key) => {
/******/ 				return key + " from " + versions[key].from;
/******/ 			}).join(", ");
/******/ 		};
/******/ 		var getValidVersion = (scope, scopeName, key, requiredVersion) => {
/******/ 			var entry = findValidVersion(scope, key, requiredVersion);
/******/ 			if(entry) return get(entry);
/******/ 			throw new Error(getInvalidVersionMessage(scope, scopeName, key, requiredVersion));
/******/ 		};
/******/ 		var warnInvalidVersion = (scope, scopeName, key, requiredVersion) => {
/******/ 			typeof console !== "undefined" && console.warn && console.warn(getInvalidVersionMessage(scope, scopeName, key, requiredVersion));
/******/ 		};
/******/ 		var get = (entry) => {
/******/ 			entry.loaded = 1;
/******/ 			return entry.get()
/******/ 		};
/******/ 		var init = (fn) => function(scopeName, a, b, c) {
/******/ 			var promise = __webpack_require__.I(scopeName);
/******/ 			if (promise.then) return promise.then(fn.bind(fn, scopeName, __webpack_require__.S[scopeName], a, b, c));
/******/ 			return fn(scopeName, __webpack_require__.S[scopeName], a, b, c);
/******/ 		};
/******/ 		
/******/ 		var load = /*#__PURE__*/ init((scopeName, scope, key) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return get(findVersion(scope, key));
/******/ 		});
/******/ 		var loadFallback = /*#__PURE__*/ init((scopeName, scope, key, fallback) => {
/******/ 			return scope && __webpack_require__.o(scope, key) ? get(findVersion(scope, key)) : fallback();
/******/ 		});
/******/ 		var loadVersionCheck = /*#__PURE__*/ init((scopeName, scope, key, version) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return get(findValidVersion(scope, key, version) || warnInvalidVersion(scope, scopeName, key, version) || findVersion(scope, key));
/******/ 		});
/******/ 		var loadSingletonVersionCheck = /*#__PURE__*/ init((scopeName, scope, key, version) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return getSingletonVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var loadStrictVersionCheck = /*#__PURE__*/ init((scopeName, scope, key, version) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return getValidVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var loadStrictSingletonVersionCheck = /*#__PURE__*/ init((scopeName, scope, key, version) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return getStrictSingletonVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var loadVersionCheckFallback = /*#__PURE__*/ init((scopeName, scope, key, version, fallback) => {
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			return get(findValidVersion(scope, key, version) || warnInvalidVersion(scope, scopeName, key, version) || findVersion(scope, key));
/******/ 		});
/******/ 		var loadSingletonVersionCheckFallback = /*#__PURE__*/ init((scopeName, scope, key, version, fallback) => {
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			return getSingletonVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var loadStrictVersionCheckFallback = /*#__PURE__*/ init((scopeName, scope, key, version, fallback) => {
/******/ 			var entry = scope && __webpack_require__.o(scope, key) && findValidVersion(scope, key, version);
/******/ 			return entry ? get(entry) : fallback();
/******/ 		});
/******/ 		var loadStrictSingletonVersionCheckFallback = /*#__PURE__*/ init((scopeName, scope, key, version, fallback) => {
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			return getStrictSingletonVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var installedModules = {};
/******/ 		var moduleToHandlerMapping = {
/******/ 			5: () => loadStrictVersionCheckFallback("default", "date-fns", [1,2,12,0], () => __webpack_require__.e("vendors-node_modules_date-fns_esm_index_js").then(() => () => __webpack_require__(/*! date-fns */ 6))),
/******/ 			4: () => loadSingletonVersionCheckFallback("default", "react", [1,16,8,0], () => __webpack_require__.e("node_modules_react_index_js").then(() => () => __webpack_require__(/*! react */ 237)))
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
		return Promise.all([__webpack_require__.e("webpack_sharing_consume_default_react"), __webpack_require__.e("src-c_Component_js")]).then(() => () => (__webpack_require__(/*! ./src-c/Component */ 3)));
	},
	"./Component2": () => {
		return Promise.all([__webpack_require__.e("webpack_sharing_consume_default_react"), __webpack_require__.e("src-c_LazyComponent_js")]).then(() => () => (__webpack_require__(/*! ./src-c/LazyComponent */ 6)));
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
/******/ 		var dataWebpackPrefix = "module-federation-ccc:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
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
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
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
/******/ 				script.parentNode && script.parentNode.removeChild(script);
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
/******/ 			var uniqueName = "module-federation-ccc";
/******/ 			var register = (name, version, factory) => {
/******/ 				var versions = scope[name] = scope[name] || {};
/******/ 				var activeVersion = versions[version];
/******/ 				if(!activeVersion || uniqueName > activeVersion.from) versions[version] = { get: factory, from: uniqueName };
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
/******/ 					register("date-fns", "2.14.0", () => __webpack_require__.e("vendors-node_modules_date-fns_esm_index_js").then(() => () => __webpack_require__(/*! ../../node_modules/date-fns/esm/index.js */ 8)));
/******/ 					register("lodash/random", "4.17.15", () => __webpack_require__.e("vendors-node_modules_lodash_random_js").then(() => () => __webpack_require__(/*! ../../node_modules/lodash/random.js */ 239)));
/******/ 				}
/******/ 				break;
/******/ 			}
/******/ 			return promises.length && (initPromises[name] = Promise.all(promises).then(() => initPromises[name] = 1));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/consumes */
/******/ 	(() => {
/******/ 		var parseVersion = (str) => {
/******/ 			var convertNumber = (str) => +str == str ? +str : str;;
/******/ 			var splitAndConvert = (str) => str.split(".").map(convertNumber);;
/******/ 			// see webpack/lib/util/semver.js for original code
/******/ 			var n=/^([^-+]+)?(?:-([^+]+))?(?:\+(.+))?$/.exec(str),p=n[1]?splitAndConvert(n[1]):[];return n[2]&&(p.length++,p.push.apply(p,splitAndConvert(n[2]))),n[3]&&(p.push([]),p.push.apply(p,splitAndConvert(n[3]))),p
/******/ 		}
/******/ 		var versionLt = (a, b) => {
/******/ 			// see webpack/lib/util/semver.js for original code
/******/ 			for(var r=0;;){if(r>=a.length)return r<b.length&&"u"!=(typeof b[r])[0];var t=a[r],e=(typeof t)[0];if(r>=b.length)return"u"==e;var n=b[r],f=(typeof n)[0];if(e!=f)return"o"==e&&"n"==f||("s"==f||"u"==e);if("o"!=e&&"u"!=e&&t!=n)return t<n;r++}
/******/ 		}
/******/ 		var rangeToString = (range) => {
/******/ 			// see webpack/lib/util/semver.js for original code
/******/ 			if(1===range.length)return"*";if(0 in range){var r="",n=range[0];r+=0==n?">=":-1==n?"<":1==n?"^":2==n?"~":n>0?"=":"!=";for(var e=1,a=1;a<range.length;a++){e--,r+="u"==(typeof(t=range[a]))[0]?"-":(e>0?".":"")+(e=2,t)}return r}var g=[];for(a=1;a<range.length;a++){var t=range[a];g.push(0===t?"not("+o()+")":1===t?"("+o()+" || "+o()+")":2===t?g.pop()+" "+g.pop():rangeToString(t))}return o();function o(){return g.pop().replace(/^\((.+)\)$/,"$1")}
/******/ 		}
/******/ 		var satisfy = (range, version) => {
/******/ 			// see webpack/lib/util/semver.js for original code
/******/ 			if(0 in range){version=parseVersion(version);var e=range[0],r=e<0;r&&(e=-e-1);for(var n=0,i=1,f=!0;;i++,n++){var a,s,t=i<range.length?(typeof range[i])[0]:"";if(n>=version.length||"o"==(s=(typeof(a=version[n]))[0]))return!f||("u"==t?i>e&&!r:""==t!=r);if("u"==s){if(!f||"u"!=t)return!1}else if(f)if(t==s)if(i<=e){if(a!=range[i])return!1}else{if(r?a>range[i]:a<range[i])return!1;a!=range[i]&&(f=!1)}else if("s"!=t&&"n"!=t){if(r||i<=e)return!1;f=!1,i--}else{if(i<=e||s<t!=r)return!1;f=!1}else"s"!=t&&"n"!=t&&(f=!1,i--)}}var g=[],o=g.pop.bind(g);for(n=1;n<range.length;n++){var u=range[n];g.push(1==u?o()|o():2==u?o()&o():u?satisfy(u,version):!o())}return!!o()
/******/ 		}
/******/ 		var ensureExistence = (scopeName, key) => {
/******/ 			var scope = __webpack_require__.S[scopeName];
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) throw new Error("Shared module " + key + " doesn't exist in shared scope " + scopeName);
/******/ 			return scope;
/******/ 		};
/******/ 		var findVersion = (scope, key) => {
/******/ 			var versions = scope[key];
/******/ 			var key = Object.keys(versions).reduce((a, b) => {
/******/ 				return !a || versionLt(a, b) ? b : a;
/******/ 			}, 0);
/******/ 			return key && versions[key]
/******/ 		};
/******/ 		var findSingletonVersionKey = (scope, key) => {
/******/ 			var versions = scope[key];
/******/ 			return Object.keys(versions).reduce((a, b) => {
/******/ 				return !a || (!versions[a].loaded && versionLt(a, b)) ? b : a;
/******/ 			}, 0);
/******/ 		};
/******/ 		var getInvalidSingletonVersionMessage = (key, version, requiredVersion) => {
/******/ 			return "Unsatisfied version " + version + " of shared singleton module " + key + " (required " + rangeToString(requiredVersion) + ")"
/******/ 		};
/******/ 		var getSingletonVersion = (scope, scopeName, key, requiredVersion) => {
/******/ 			var version = findSingletonVersionKey(scope, key);
/******/ 			if (!satisfy(requiredVersion, version)) typeof console !== "undefined" && console.warn && console.warn(getInvalidSingletonVersionMessage(key, version, requiredVersion));
/******/ 			return get(scope[key][version]);
/******/ 		};
/******/ 		var getStrictSingletonVersion = (scope, scopeName, key, requiredVersion) => {
/******/ 			var version = findSingletonVersionKey(scope, key);
/******/ 			if (!satisfy(requiredVersion, version)) throw new Error(getInvalidSingletonVersionMessage(key, version, requiredVersion));
/******/ 			return get(scope[key][version]);
/******/ 		};
/******/ 		var findValidVersion = (scope, key, requiredVersion) => {
/******/ 			var versions = scope[key];
/******/ 			var key = Object.keys(versions).reduce((a, b) => {
/******/ 				if (!satisfy(requiredVersion, b)) return a;
/******/ 				return !a || versionLt(a, b) ? b : a;
/******/ 			}, 0);
/******/ 			return key && versions[key]
/******/ 		};
/******/ 		var getInvalidVersionMessage = (scope, scopeName, key, requiredVersion) => {
/******/ 			var versions = scope[key];
/******/ 			return "No satisfying version (" + rangeToString(requiredVersion) + ") of shared module " + key + " found in shared scope " + scopeName + ".\n" +
/******/ 				"Available versions: " + Object.keys(versions).map((key) => {
/******/ 				return key + " from " + versions[key].from;
/******/ 			}).join(", ");
/******/ 		};
/******/ 		var getValidVersion = (scope, scopeName, key, requiredVersion) => {
/******/ 			var entry = findValidVersion(scope, key, requiredVersion);
/******/ 			if(entry) return get(entry);
/******/ 			throw new Error(getInvalidVersionMessage(scope, scopeName, key, requiredVersion));
/******/ 		};
/******/ 		var warnInvalidVersion = (scope, scopeName, key, requiredVersion) => {
/******/ 			typeof console !== "undefined" && console.warn && console.warn(getInvalidVersionMessage(scope, scopeName, key, requiredVersion));
/******/ 		};
/******/ 		var get = (entry) => {
/******/ 			entry.loaded = 1;
/******/ 			return entry.get()
/******/ 		};
/******/ 		var init = (fn) => function(scopeName, a, b, c) {
/******/ 			var promise = __webpack_require__.I(scopeName);
/******/ 			if (promise.then) return promise.then(fn.bind(fn, scopeName, __webpack_require__.S[scopeName], a, b, c));
/******/ 			return fn(scopeName, __webpack_require__.S[scopeName], a, b, c);
/******/ 		};
/******/ 		
/******/ 		var load = /*#__PURE__*/ init((scopeName, scope, key) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return get(findVersion(scope, key));
/******/ 		});
/******/ 		var loadFallback = /*#__PURE__*/ init((scopeName, scope, key, fallback) => {
/******/ 			return scope && __webpack_require__.o(scope, key) ? get(findVersion(scope, key)) : fallback();
/******/ 		});
/******/ 		var loadVersionCheck = /*#__PURE__*/ init((scopeName, scope, key, version) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return get(findValidVersion(scope, key, version) || warnInvalidVersion(scope, scopeName, key, version) || findVersion(scope, key));
/******/ 		});
/******/ 		var loadSingletonVersionCheck = /*#__PURE__*/ init((scopeName, scope, key, version) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return getSingletonVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var loadStrictVersionCheck = /*#__PURE__*/ init((scopeName, scope, key, version) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return getValidVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var loadStrictSingletonVersionCheck = /*#__PURE__*/ init((scopeName, scope, key, version) => {
/******/ 			ensureExistence(scopeName, key);
/******/ 			return getStrictSingletonVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var loadVersionCheckFallback = /*#__PURE__*/ init((scopeName, scope, key, version, fallback) => {
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			return get(findValidVersion(scope, key, version) || warnInvalidVersion(scope, scopeName, key, version) || findVersion(scope, key));
/******/ 		});
/******/ 		var loadSingletonVersionCheckFallback = /*#__PURE__*/ init((scopeName, scope, key, version, fallback) => {
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			return getSingletonVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var loadStrictVersionCheckFallback = /*#__PURE__*/ init((scopeName, scope, key, version, fallback) => {
/******/ 			var entry = scope && __webpack_require__.o(scope, key) && findValidVersion(scope, key, version);
/******/ 			return entry ? get(entry) : fallback();
/******/ 		});
/******/ 		var loadStrictSingletonVersionCheckFallback = /*#__PURE__*/ init((scopeName, scope, key, version, fallback) => {
/******/ 			if(!scope || !__webpack_require__.o(scope, key)) return fallback();
/******/ 			return getStrictSingletonVersion(scope, scopeName, key, version);
/******/ 		});
/******/ 		var installedModules = {};
/******/ 		var moduleToHandlerMapping = {
/******/ 			4: () => loadSingletonVersionCheck("default", "react", [1,16,8,0]),
/******/ 			5: () => loadStrictVersionCheckFallback("default", "date-fns", [1,2,12,0], () => __webpack_require__.e("vendors-node_modules_date-fns_esm_index_js").then(() => () => __webpack_require__(/*! date-fns */ 8))),
/******/ 			7: () => loadStrictVersionCheckFallback("default", "lodash/random", [1,4,17,4], () => __webpack_require__.e("vendors-node_modules_lodash_random_js").then(() => () => __webpack_require__(/*! lodash/random */ 239)))
/******/ 		};
/******/ 		// no consumes in initial chunks
/******/ 		var chunkMapping = {
/******/ 			"webpack_sharing_consume_default_react": [
/******/ 				4
/******/ 			],
/******/ 			"src-c_Component_js": [
/******/ 				5
/******/ 			],
/******/ 			"src-c_LazyComponent_js": [
/******/ 				7
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
/******/ 						if("webpack_sharing_consume_default_react" != chunkId) {
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
Version: webpack 5.0.0-beta.20
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                    Asset      Size
                                   app.js  28.8 KiB  [emitted]  [name: app]
    node_modules_react_index_js-_11190.js  12.6 KiB  [emitted]
    node_modules_react_index_js-_11191.js  10.2 KiB  [emitted]
                      src_bootstrap_js.js   157 KiB  [emitted]
    Entrypoint app = app.js
    chunk app.js (app) 669 bytes (javascript) 42 bytes (share-init) 18.3 KiB (runtime) [entry] [rendered]
        > ./src/index.js app
     ./src/index.js 585 bytes [built]
     external "mfeBBB@/dist/bbb/mfeBBB.js" 42 bytes [built]
     external "mfeCCC@/dist/ccc/mfeCCC.js" 42 bytes [built]
     provide shared module (default) react@16.13.1 = ../../node_modules/react/index.js 42 bytes [built]
         + 13 hidden root modules
    chunk node_modules_react_index_js-_11190.js 8.76 KiB [rendered]
        > provide shared module (default) react@16.13.1 = ../../node_modules/react/index.js
     ../../node_modules/react/index.js 190 bytes [built]
         + 2 hidden dependent modules
    chunk node_modules_react_index_js-_11191.js 6.7 KiB [rendered]
        > consume shared module (default) react@^16.13.1 (singleton) (fallback: ../../node_modules/react/index.js)
        > consume shared module (default) react@^16.8.0 (singleton) (fallback: ../../node_modules/react/index.js)
     ../../node_modules/react/index.js 190 bytes [built]
         + 1 hidden dependent module
    chunk src_bootstrap_js.js 142 KiB (javascript) 84 bytes (consume-shared) 12 bytes (remote) 12 bytes (share-init) [rendered]
        > ./bootstrap ./src/index.js 8:0-21
     ./src/bootstrap.js 382 bytes [built]
         + 20 hidden dependent modules
    chunk 6 bytes (remote) 6 bytes (share-init)
        > mfe-c/Component2 ./src/App.js 8:49-75
     remote mfe-c/Component2 6 bytes (remote) 6 bytes (share-init) [built]
Child mfe-b:
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                            Asset      Size
                                        mfeBBB.js  23.8 KiB  [emitted]  [name: mfeBBB]
                   node_modules_react_index_js.js  12.6 KiB  [emitted]
                            src-b_Component_js.js  2.26 KiB  [emitted]
    vendors-node_modules_date-fns_esm_index_js.js   796 KiB  [emitted]  [id hint: vendors]
    Entrypoint mfeBBB = mfeBBB.js
    chunk mfeBBB.js (mfeBBB) 42 bytes (javascript) 84 bytes (share-init) 16 KiB (runtime) [entry] [rendered]
        > mfeBBB
     container entry 42 bytes [built]
     provide shared module (default) date-fns@2.14.0 = ../../node_modules/date-fns/esm/index.js 42 bytes [built]
     provide shared module (default) react@16.13.1 = ../../node_modules/react/index.js 42 bytes [built]
         + 11 hidden root modules
    chunk node_modules_react_index_js.js 8.76 KiB [rendered]
        > provide shared module (default) react@16.13.1 = ../../node_modules/react/index.js
        > consume shared module (default) react@^16.8.0 (singleton) (fallback: ../../node_modules/react/index.js)
     ../../node_modules/react/index.js 190 bytes [built]
         + 2 hidden dependent modules
    chunk src-b_Component_js.js 753 bytes (javascript) 84 bytes (consume-shared) [rendered]
        > ./src-b/Component container entry ./Component
     ./src-b/Component.js 753 bytes [built]
         + 2 hidden dependent modules
    chunk vendors-node_modules_date-fns_esm_index_js.js (id hint: vendors) 486 KiB [rendered] reused as split chunk (cache group: defaultVendors)
        > provide shared module (default) date-fns@2.14.0 = ../../node_modules/date-fns/esm/index.js
        > consume shared module (default) date-fns@^2.12.0 (strict) (fallback: ../../node_modules/date-fns/esm/index.js)
     ../../node_modules/date-fns/esm/index.js 13.1 KiB [built]
         + 230 hidden dependent modules
Child mfe-c:
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                            Asset      Size
                                        mfeCCC.js  24.8 KiB  [emitted]  [name: mfeCCC]
                            src-c_Component_js.js  1.99 KiB  [emitted]
                        src-c_LazyComponent_js.js  2.08 KiB  [emitted]
    vendors-node_modules_date-fns_esm_index_js.js   797 KiB  [emitted]  [id hint: vendors]
         vendors-node_modules_lodash_random_js.js  23.3 KiB  [emitted]  [id hint: vendors]
    Entrypoint mfeCCC = mfeCCC.js
    chunk mfeCCC.js (mfeCCC) 42 bytes (javascript) 84 bytes (share-init) 16.4 KiB (runtime) [entry] [rendered]
        > mfeCCC
     container entry 42 bytes [built]
     provide shared module (default) date-fns@2.14.0 = ../../node_modules/date-fns/esm/index.js 42 bytes [built]
     provide shared module (default) lodash/random@4.17.15 = ../../node_modules/lodash/random.js 42 bytes [built]
         + 12 hidden root modules
    chunk src-c_Component_js.js 469 bytes (javascript) 42 bytes (consume-shared) [rendered]
        > ./src-c/Component container entry ./Component
     ./src-c/Component.js 469 bytes [built]
         + 1 hidden dependent module
    chunk src-c_LazyComponent_js.js 506 bytes (javascript) 42 bytes (consume-shared) [rendered]
        > ./src-c/LazyComponent container entry ./Component2
     ./src-c/LazyComponent.js 506 bytes [built]
         + 1 hidden dependent module
    chunk vendors-node_modules_date-fns_esm_index_js.js (id hint: vendors) 486 KiB [rendered] reused as split chunk (cache group: defaultVendors)
        > provide shared module (default) date-fns@2.14.0 = ../../node_modules/date-fns/esm/index.js
        > consume shared module (default) date-fns@^2.12.0 (strict) (fallback: ../../node_modules/date-fns/esm/index.js)
     ../../node_modules/date-fns/esm/index.js 13.1 KiB [built]
         + 230 hidden dependent modules
    chunk vendors-node_modules_lodash_random_js.js (id hint: vendors) 15.2 KiB [rendered] reused as split chunk (cache group: defaultVendors)
        > provide shared module (default) lodash/random@4.17.15 = ../../node_modules/lodash/random.js
        > consume shared module (default) lodash/random@^4.17.4 (strict) (fallback: ../../node_modules/lodash/random.js)
     ../../node_modules/lodash/random.js 2.32 KiB [built]
         + 18 hidden dependent modules
    chunk 42 bytes split chunk (cache group: default)
        > ./src-c/Component container entry ./Component
        > ./src-c/LazyComponent container entry ./Component2
     consume shared module (default) react@^16.8.0 (singleton) 42 bytes [built]
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.20
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                                Asset       Size
                                               app.js   6.92 KiB  [emitted]  [name: app]
                node_modules_react_index_js-_11190.js   7.26 KiB  [emitted]
    node_modules_react_index_js-_11190.js.LICENSE.txt  295 bytes  [emitted]
                node_modules_react_index_js-_11191.js   6.31 KiB  [emitted]
    node_modules_react_index_js-_11191.js.LICENSE.txt  243 bytes  [emitted]
                                  src_bootstrap_js.js    129 KiB  [emitted]
                      src_bootstrap_js.js.LICENSE.txt  546 bytes  [emitted]
    Entrypoint app = app.js
    chunk app.js (app) 669 bytes (javascript) 42 bytes (share-init) 18.2 KiB (runtime) [entry] [rendered]
        > ./src/index.js app
     ./src/index.js 585 bytes [built]
     external "mfeBBB@/dist/bbb/mfeBBB.js" 42 bytes [built]
     external "mfeCCC@/dist/ccc/mfeCCC.js" 42 bytes [built]
     provide shared module (default) react@16.13.1 = ../../node_modules/react/index.js 42 bytes [built]
         + 13 hidden root modules
    chunk node_modules_react_index_js-_11190.js 8.76 KiB [rendered]
        > provide shared module (default) react@16.13.1 = ../../node_modules/react/index.js
     ../../node_modules/react/index.js 190 bytes [built]
         + 2 hidden dependent modules
    chunk node_modules_react_index_js-_11191.js 6.7 KiB [rendered]
        > consume shared module (default) react@^16.13.1 (singleton) (fallback: ../../node_modules/react/index.js)
        > consume shared module (default) react@^16.8.0 (singleton) (fallback: ../../node_modules/react/index.js)
     ../../node_modules/react/index.js 190 bytes [built]
         + 1 hidden dependent module
    chunk src_bootstrap_js.js 142 KiB (javascript) 84 bytes (consume-shared) 12 bytes (remote) 12 bytes (share-init) [rendered]
        > ./bootstrap ./src/index.js 8:0-21
     ./src/bootstrap.js + 7 modules 14 KiB [built]
         + 13 hidden dependent modules
    chunk 6 bytes (remote) 6 bytes (share-init)
        > mfe-c/Component2 ./src/App.js 8:49-75
     remote mfe-c/Component2 6 bytes (remote) 6 bytes (share-init) [built]
Child mfe-b:
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                            Asset       Size
                                        mfeBBB.js   5.54 KiB  [emitted]  [name: mfeBBB]
                   node_modules_react_index_js.js   7.21 KiB  [emitted]
       node_modules_react_index_js.js.LICENSE.txt  295 bytes  [emitted]
                            src-b_Component_js.js  493 bytes  [emitted]
    vendors-node_modules_date-fns_esm_index_js.js   77.4 KiB  [emitted]  [id hint: vendors]
    Entrypoint mfeBBB = mfeBBB.js
    chunk mfeBBB.js (mfeBBB) 42 bytes (javascript) 84 bytes (share-init) 15.9 KiB (runtime) [entry] [rendered]
        > mfeBBB
     container entry 42 bytes [built]
     provide shared module (default) date-fns@2.14.0 = ../../node_modules/date-fns/esm/index.js 42 bytes [built]
     provide shared module (default) react@16.13.1 = ../../node_modules/react/index.js 42 bytes [built]
         + 11 hidden root modules
    chunk node_modules_react_index_js.js 8.76 KiB [rendered]
        > consume shared module (default) react@^16.8.0 (singleton) (fallback: ../../node_modules/react/index.js)
        > provide shared module (default) react@16.13.1 = ../../node_modules/react/index.js
     ../../node_modules/react/index.js 190 bytes [built]
         + 2 hidden dependent modules
    chunk src-b_Component_js.js 753 bytes (javascript) 84 bytes (consume-shared) [rendered]
        > ./src-b/Component container entry ./Component
     ./src-b/Component.js 753 bytes [built]
         + 2 hidden dependent modules
    chunk vendors-node_modules_date-fns_esm_index_js.js (id hint: vendors) 486 KiB [rendered] reused as split chunk (cache group: defaultVendors)
        > consume shared module (default) date-fns@^2.12.0 (strict) (fallback: ../../node_modules/date-fns/esm/index.js)
        > provide shared module (default) date-fns@2.14.0 = ../../node_modules/date-fns/esm/index.js
     ../../node_modules/date-fns/esm/index.js + 230 modules 486 KiB [built]
Child mfe-c:
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                            Asset       Size
                                        mfeCCC.js   6.18 KiB  [emitted]  [name: mfeCCC]
                 node_modules_lodash_random_js.js   2.95 KiB  [emitted]
                            src-c_Component_js.js  493 bytes  [emitted]
                        src-c_LazyComponent_js.js  537 bytes  [emitted]
    vendors-node_modules_date-fns_esm_index_js.js   77.4 KiB  [emitted]  [id hint: vendors]
    Entrypoint mfeCCC = mfeCCC.js
    chunk mfeCCC.js (mfeCCC) 42 bytes (javascript) 84 bytes (share-init) 16.3 KiB (runtime) [entry] [rendered]
        > mfeCCC
     container entry 42 bytes [built]
     provide shared module (default) date-fns@2.14.0 = ../../node_modules/date-fns/esm/index.js 42 bytes [built]
     provide shared module (default) lodash/random@4.17.15 = ../../node_modules/lodash/random.js 42 bytes [built]
         + 12 hidden root modules
    chunk node_modules_lodash_random_js.js 15.2 KiB [rendered]
        > provide shared module (default) lodash/random@4.17.15 = ../../node_modules/lodash/random.js
        > consume shared module (default) lodash/random@^4.17.4 (strict) (fallback: ../../node_modules/lodash/random.js)
     ../../node_modules/lodash/random.js 2.32 KiB [built]
         + 18 hidden dependent modules
    chunk src-c_Component_js.js 469 bytes (javascript) 42 bytes (consume-shared) [rendered]
        > ./src-c/Component container entry ./Component
     ./src-c/Component.js 469 bytes [built]
         + 1 hidden dependent module
    chunk src-c_LazyComponent_js.js 506 bytes (javascript) 42 bytes (consume-shared) [rendered]
        > ./src-c/LazyComponent container entry ./Component2
     ./src-c/LazyComponent.js 506 bytes [built]
         + 1 hidden dependent module
    chunk vendors-node_modules_date-fns_esm_index_js.js (id hint: vendors) 486 KiB [rendered] reused as split chunk (cache group: defaultVendors)
        > consume shared module (default) date-fns@^2.12.0 (strict) (fallback: ../../node_modules/date-fns/esm/index.js)
        > provide shared module (default) date-fns@2.14.0 = ../../node_modules/date-fns/esm/index.js
     ../../node_modules/date-fns/esm/index.js + 230 modules 486 KiB [built]
    chunk 42 bytes split chunk (cache group: default)
        > ./src-c/Component container entry ./Component
        > ./src-c/LazyComponent container entry ./Component2
     consume shared module (default) react@^16.8.0 (singleton) 42 bytes [built]
```
