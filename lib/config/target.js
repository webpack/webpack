/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const memoize = require("../util/memoize");

const getBrowserslistTargetHandler = memoize(() =>
	require("./browserslistTargetHandler")
);

/**
 * Gets default target.
 * @param {string} context the context directory
 * @returns {string} default target
 */
const getDefaultTarget = (context) => {
	const browsers = getBrowserslistTargetHandler().load(undefined, context);
	return browsers ? "browserslist" : "web";
};

/**
 * Defines the platform target properties type used by this module.
 * @typedef {object} PlatformTargetProperties
 * @property {boolean | null=} web web platform, importing of http(s) and std: is available
 * @property {boolean | null=} browser browser platform, running in a normal web browser
 * @property {boolean | null=} webworker (Web)Worker platform, running in a web/shared/service worker
 * @property {boolean | null=} node node platform, require of node built-in modules is available
 * @property {boolean | null=} deno deno platform, node built-in modules (via the `node:` specifier) and web APIs are available
 * @property {boolean | null=} bun bun platform, bun and node built-in modules are available
 * @property {boolean | null=} nwjs nwjs platform, require of legacy nw.gui is available
 * @property {boolean | null=} electron electron platform, require of some electron built-in modules is available
 * @property {boolean | null=} universal universal ESM target spanning both web and node (target `"universal"` or `["web", "node"]`)
 */

/**
 * Defines the electron context target properties type used by this module.
 * @typedef {object} ElectronContextTargetProperties
 * @property {boolean | null} electronMain in main context
 * @property {boolean | null} electronPreload in preload context
 * @property {boolean | null} electronRenderer in renderer context with node integration
 */

/**
 * Defines the api target properties type used by this module.
 * @typedef {object} ApiTargetProperties
 * @property {boolean | null} require has require function available
 * @property {boolean | null} nodeBuiltins has node.js built-in modules available
 * @property {boolean | null} nodePrefixForCoreModules node.js allows to use `node:` prefix for core modules
 * @property {boolean | null} nodeBuiltinModuleGetter node.js exposes `process.getBuiltinModule()` to synchronously load core modules
 * @property {boolean | null} importMetaDirnameAndFilename node.js allows to use `import.meta.dirname` and `import.meta.filename`
 * @property {boolean | null} document has document available (allows script tags)
 * @property {(boolean | null)=} modulePreload supports `<link rel="modulepreload">` (optional; absent means "assume supported")
 * @property {boolean | null} importScripts has importScripts available
 * @property {boolean | null} importScriptsInWorker has importScripts available when creating a worker
 * @property {boolean | null} fetchWasm has fetch function available for WebAssembly
 * @property {boolean | null} global has global variable available
 */

/**
 * Defines the ecma target properties type used by this module.
 * @typedef {object} EcmaTargetProperties
 * @property {boolean | null} globalThis has globalThis variable available
 * @property {boolean | null} symbol `Symbol` is available
 * @property {boolean | null} hasOwn `Object.hasOwn` is available
 * @property {boolean | null} bigIntLiteral big int literal syntax is available
 * @property {boolean | null} const const variable declarations are available
 * @property {boolean | null} let let variable declarations are available
 * @property {boolean | null} logicalAssignment logical assignment operators (`||=`, `&&=`, `??=`) are available
 * @property {boolean | null} methodShorthand object method shorthand is available
 * @property {boolean | null} arrowFunction arrow functions are available
 * @property {boolean | null} forOf for of iteration is available
 * @property {boolean | null} destructuring destructuring is available
 * @property {boolean | null} dynamicImport async import() is available
 * @property {boolean | null} dynamicImportInWorker async import() is available when creating a worker
 * @property {boolean | null} module ESM syntax is available (when in module)
 * @property {boolean | null} optionalChaining optional chaining is available
 * @property {boolean | null} spread spread and rest in array/object literals and calls is available
 * @property {boolean | null} templateLiteral template literal is available
 * @property {boolean | null} asyncFunction async functions and await are available
 * @property {boolean | null} generator generator functions and yield are available
 */

/**
 * Defines the shared type used by this module.
 * @template T
 * @typedef {{ [P in keyof T]?: never }} Never<T>
 */

/**
 * Defines the shared type used by this module.
 * @template A
 * @template B
 * @typedef {(A & Never<B>) | (Never<A> & B) | (A & B)} Mix<A, B>
 */

/** @typedef {Mix<Mix<PlatformTargetProperties, ElectronContextTargetProperties>, Mix<ApiTargetProperties, EcmaTargetProperties>>} TargetProperties */

/**
 * Returns check if version is greater or equal.
 * @param {string} major major version
 * @param {string | undefined} minor minor version
 * @returns {(vMajor: number, vMinor?: number) => boolean | undefined} check if version is greater or equal
 */
const versionDependent = (major, minor) => {
	if (!major) {
		return () => /** @type {undefined} */ (undefined);
	}
	/** @type {number} */
	const nMajor = Number(major);
	/** @type {number} */
	const nMinor = minor ? Number(minor) : 0;
	return (vMajor, vMinor = 0) =>
		nMajor > vMajor || (nMajor === vMajor && nMinor >= vMinor);
};

/** @type {[string, string, RegExp, (...args: string[]) => Partial<TargetProperties>][]} */
const TARGETS = [
	[
		"browserslist / browserslist:env / browserslist:query / browserslist:path-to-config / browserslist:path-to-config:env",
		"Resolve features from browserslist. Will resolve browserslist config automatically. Only browser or node queries are supported (electron is not supported). Examples: 'browserslist:modern' to use 'modern' environment from browserslist config",
		/^browserslist(?::(.+))?$/,
		(rest, context) => {
			const browserslistTargetHandler = getBrowserslistTargetHandler();
			const browsers = browserslistTargetHandler.load(
				rest ? rest.trim() : null,
				context
			);
			if (!browsers) {
				throw new Error(`No browserslist config found to handle the 'browserslist' target.
See https://github.com/browserslist/browserslist#queries for possible ways to provide a config.
The recommended way is to add a 'browserslist' key to your package.json and list supported browsers (resp. node.js versions).
You can also more options via the 'target' option: 'browserslist' / 'browserslist:env' / 'browserslist:query' / 'browserslist:path-to-config' / 'browserslist:path-to-config:env'`);
			}

			return browserslistTargetHandler.resolve(browsers);
		}
	],
	[
		"web",
		"Web browser.",
		/^web$/,
		() => ({
			node: false,
			deno: false,
			bun: false,
			web: true,
			webworker: null,
			browser: true,
			electron: false,
			nwjs: false,

			document: true,
			importScriptsInWorker: true,
			fetchWasm: true,
			nodeBuiltins: false,
			importScripts: false,
			require: false,
			global: false
		})
	],
	[
		"webworker",
		"Web Worker, SharedWorker or Service Worker.",
		/^webworker$/,
		() => ({
			node: false,
			deno: false,
			bun: false,
			web: true,
			webworker: true,
			browser: true,
			electron: false,
			nwjs: false,

			importScripts: true,
			importScriptsInWorker: true,
			fetchWasm: true,
			nodeBuiltins: false,
			require: false,
			document: false,
			global: false
		})
	],
	[
		"universal",
		"Universal target running in browser, web worker, Node.js, Electron and NW.js. Output is always ECMAScript modules.",
		/^universal$/,
		// merged web + webworker + node + electron + nwjs properties; output is
		// always ESM, so `require` (sync CommonJS) is never available
		() => ({
			node: null,
			deno: null,
			bun: null,
			web: null,
			webworker: null,
			browser: null,
			electron: null,
			nwjs: null,

			electronMain: null,
			electronPreload: null,
			electronRenderer: null,

			document: null,
			importScriptsInWorker: null,
			fetchWasm: null,
			nodeBuiltins: null,
			importScripts: null,
			require: false,
			global: null,

			module: true,
			dynamicImport: true,
			dynamicImportInWorker: true
		})
	],
	[
		"[async-]node[X[.Y]]",
		"Node.js in version X.Y. The 'async-' prefix will load chunks asynchronously via 'fs' and 'vm' instead of 'require()'. Examples: node14.5, async-node10.",
		/^(async-)?node((\d+)(?:\.(\d+))?)?$/,
		(asyncFlag, _, major, minor) => {
			const v = versionDependent(major, minor);
			// see https://node.green/
			return {
				node: true,
				deno: false,
				bun: false,
				web: false,
				webworker: false,
				browser: false,
				electron: false,
				nwjs: false,

				require: !asyncFlag,
				nodeBuiltins: true,
				// v16.0.0, v14.18.0
				nodePrefixForCoreModules: Number(major) < 15 ? v(14, 18) : v(16),
				// v22.3.0, backported to v20.16.0; use the conservative single threshold
				nodeBuiltinModuleGetter: v(22, 3),
				// Added in: v21.2.0, v20.11.0, but Node.js will output experimental warning, we don't want it
				// v24.0.0, v22.16.0 - This property is no longer experimental.
				importMetaDirnameAndFilename: v(22, 16),
				global: true,
				document: false,
				fetchWasm: false,
				importScripts: false,
				importScriptsInWorker: false,

				globalThis: v(12),
				symbol: v(0, 12),
				hasOwn: v(16, 9),
				const: v(6),
				let: v(6),
				logicalAssignment: v(15),
				templateLiteral: v(4),
				optionalChaining: v(14),
				spread: v(8, 3),
				methodShorthand: v(4),
				arrowFunction: v(6),
				asyncFunction: v(7, 6),
				generator: v(4),
				forOf: v(5),
				destructuring: v(6),
				bigIntLiteral: v(10, 4),
				dynamicImport: v(12, 17),
				dynamicImportInWorker: v(12, 17),
				module: v(12, 17)
			};
		}
	],
	[
		"deno[X[.Y]]",
		"Deno in version X.Y. Emits ESM output; node.js built-ins are available via the required 'node:' specifier and web APIs (fetch, WebAssembly, ...) are available too. Examples: deno2, deno1.40.",
		/^deno((\d+)(?:\.(\d+))?)?$/,
		(_, major, minor) => {
			const v = versionDependent(major, minor);
			// Deno ships a modern V8, so syntax features are available since 1.0.
			return {
				node: true,
				deno: true,
				web: true,
				webworker: false,
				browser: false,
				electron: false,
				nwjs: false,

				require: false,
				nodeBuiltins: true,
				// Deno only resolves node.js core modules through the `node:` specifier
				nodePrefixForCoreModules: true,
				// process.getBuiltinModule() - v2.1.0
				nodeBuiltinModuleGetter: v(2, 1),
				// import.meta.dirname / import.meta.filename - v1.40.0
				importMetaDirnameAndFilename: v(1, 40),
				global: false,
				document: false,
				fetchWasm: true,
				importScripts: false,
				importScriptsInWorker: false,

				globalThis: true,
				symbol: true,
				hasOwn: true,
				bigIntLiteral: true,
				const: true,
				let: true,
				logicalAssignment: true,
				methodShorthand: true,
				arrowFunction: true,
				forOf: true,
				destructuring: true,
				dynamicImport: true,
				dynamicImportInWorker: true,
				module: true,
				optionalChaining: true,
				spread: true,
				templateLiteral: true,
				asyncFunction: true,
				generator: true
			};
		}
	],
	[
		"bun[X[.Y]]",
		"Bun in version X.Y. Output is always ECMAScript modules. Examples: bun, bun1.1.",
		/^bun((\d+)(?:\.(\d+))?)?$/,
		() => ({
			// Bun is a modern, Node.js-compatible runtime; every released version
			// supports the full modern ECMAScript feature set, so the version is
			// accepted but does not gate any feature. Output is always ESM, so sync
			// CommonJS `require` is never available.
			node: true,
			bun: true,
			web: false,
			webworker: false,
			browser: false,
			electron: false,
			nwjs: false,

			require: false,
			nodeBuiltins: true,
			nodePrefixForCoreModules: true,
			nodeBuiltinModuleGetter: true,
			importMetaDirnameAndFilename: true,
			// Bun implements web-standard globals; use `globalThis` and load wasm
			// via `fetch()` (Bun's fetch resolves `file:` URLs) like the deno target,
			// instead of proprietary `Bun.*` runtime APIs.
			global: false,
			document: false,
			fetchWasm: true,
			importScripts: false,
			importScriptsInWorker: false,

			globalThis: true,
			symbol: true,
			hasOwn: true,
			const: true,
			let: true,
			logicalAssignment: true,
			templateLiteral: true,
			optionalChaining: true,
			spread: true,
			methodShorthand: true,
			arrowFunction: true,
			asyncFunction: true,
			generator: true,
			forOf: true,
			destructuring: true,
			bigIntLiteral: true,
			dynamicImport: true,
			dynamicImportInWorker: true,
			module: true
		})
	],
	[
		"electron[X[.Y]]-main/preload/renderer",
		"Electron in version X.Y. Script is running in main, preload resp. renderer context.",
		/^electron((\d+)(?:\.(\d+))?)?-(main|preload|renderer)$/,
		(_, major, minor, context) => {
			const v = versionDependent(major, minor);
			// see https://node.green/ + https://github.com/electron/releases
			return {
				node: true,
				deno: false,
				bun: false,
				web: context !== "main",
				webworker: false,
				browser: false,
				electron: true,
				nwjs: false,

				electronMain: context === "main",
				electronPreload: context === "preload",
				electronRenderer: context === "renderer",

				global: true,
				nodeBuiltins: true,
				// 15.0.0	- Node.js	v16.5
				// 14.0.0 - Mode.js v14.17, but prefixes only since v14.18
				nodePrefixForCoreModules: v(15),
				// 37.0.0 - Node.js v22.16
				importMetaDirnameAndFilename: v(37),

				require: true,
				document: context === "renderer",
				fetchWasm: context === "renderer",
				importScripts: false,
				importScriptsInWorker: true,

				globalThis: v(5),
				symbol: v(0, 24),
				hasOwn: v(16),
				const: v(1, 1),
				let: v(1, 1),
				// 10.0.0 - Chromium 85
				logicalAssignment: v(10),
				templateLiteral: v(1, 1),
				optionalChaining: v(8),
				spread: v(2),
				methodShorthand: v(1, 1),
				arrowFunction: v(1, 1),
				asyncFunction: v(1, 7),
				generator: v(1, 1),
				forOf: v(0, 36),
				destructuring: v(1, 1),
				bigIntLiteral: v(4),
				dynamicImport: v(11),
				dynamicImportInWorker: v(11),
				// 28.0.0 - ESM support was added
				module: v(28)
			};
		}
	],
	[
		"nwjs[X[.Y]] / node-webkit[X[.Y]]",
		"NW.js in version X.Y.",
		/^(?:nwjs|node-webkit)((\d+)(?:\.(\d+))?)?$/,
		(_, major, minor) => {
			const v = versionDependent(major, minor);
			// see https://node.green/ + https://github.com/nwjs/nw.js/blob/nw48/CHANGELOG.md
			return {
				node: true,
				deno: false,
				bun: false,
				web: true,
				webworker: null,
				browser: false,
				electron: false,
				nwjs: true,

				global: true,
				nodeBuiltins: true,
				document: false,
				importScriptsInWorker: false,
				fetchWasm: false,
				importScripts: false,
				require: false,

				globalThis: v(0, 43),
				symbol: v(0, 12),
				hasOwn: v(0, 58),
				const: v(0, 15),
				let: v(0, 15),
				// 0.48.0 - Chromium 85
				logicalAssignment: v(0, 48),
				templateLiteral: v(0, 13),
				optionalChaining: v(0, 44),
				spread: v(0, 23),
				methodShorthand: v(0, 15),
				arrowFunction: v(0, 15),
				asyncFunction: v(0, 21),
				generator: v(0, 15),
				forOf: v(0, 13),
				destructuring: v(0, 15),
				bigIntLiteral: v(0, 32),
				dynamicImport: v(0, 43),
				dynamicImportInWorker: v(0, 44),
				module: v(0, 43)
			};
		}
	],
	[
		"esX",
		"EcmaScript in this version. Examples: es2020, es5.",
		/^es(\d+)$/,
		(version) => {
			let v = Number(version);
			if (v < 1000) v += 2009;
			return {
				const: v >= 2015,
				let: v >= 2015,
				logicalAssignment: v >= 2021,
				templateLiteral: v >= 2015,
				optionalChaining: v >= 2020,
				spread: v >= 2018,
				methodShorthand: v >= 2015,
				arrowFunction: v >= 2015,
				forOf: v >= 2015,
				destructuring: v >= 2015,
				module: v >= 2015,
				asyncFunction: v >= 2017,
				generator: v >= 2015,
				globalThis: v >= 2020,
				symbol: v >= 2015,
				hasOwn: v >= 2022,
				bigIntLiteral: v >= 2020,
				dynamicImport: v >= 2020,
				dynamicImportInWorker: v >= 2020
			};
		}
	]
];

/**
 * Gets target properties.
 * @param {string} target the target
 * @param {string} context the context directory
 * @returns {TargetProperties} target properties
 */
const getTargetProperties = (target, context) => {
	for (const [, , regExp, handler] of TARGETS) {
		const match = regExp.exec(target);
		if (match) {
			const [, ...args] = match;
			const result = handler(...args, context);
			if (result) return /** @type {TargetProperties} */ (result);
		}
	}
	throw new Error(
		`Unknown target '${target}'. The following targets are supported:\n${TARGETS.map(
			([name, description]) => `* ${name}: ${description}`
		).join("\n")}`
	);
};

/**
 * Merges target properties.
 * @param {TargetProperties[]} targetProperties array of target properties
 * @returns {TargetProperties} merged target properties
 */
const mergeTargetProperties = (targetProperties) => {
	/** @type {Set<keyof TargetProperties>} */
	const keys = new Set();
	for (const tp of targetProperties) {
		for (const key of Object.keys(tp)) {
			keys.add(/** @type {keyof TargetProperties} */ (key));
		}
	}
	/** @type {TargetProperties} */
	const result = {};
	for (const key of keys) {
		let hasTrue = false;
		let hasFalse = false;
		for (const tp of targetProperties) {
			const value = tp[key];
			switch (value) {
				case true:
					hasTrue = true;
					break;
				case false:
					hasFalse = true;
					break;
			}
		}
		if (hasTrue || hasFalse) {
			/** @type {TargetProperties} */
			(result)[key] = hasFalse && hasTrue ? null : Boolean(hasTrue);
		}
	}
	return result;
};

/**
 * Gets targets properties.
 * @param {string[]} targets the targets
 * @param {string} context the context directory
 * @returns {TargetProperties} target properties
 */
const getTargetsProperties = (targets, context) =>
	mergeTargetProperties(targets.map((t) => getTargetProperties(t, context)));

module.exports.getDefaultTarget = getDefaultTarget;
module.exports.getTargetProperties = getTargetProperties;
module.exports.getTargetsProperties = getTargetsProperties;
