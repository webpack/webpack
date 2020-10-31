/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const browserslist = require("browserslist");
const path = require("path");

/** @typedef {import("./target").ApiTargetProperties} ApiTargetProperties */
/** @typedef {import("./target").EcmaTargetProperties} EcmaTargetProperties */
/** @typedef {import("./target").PlatformTargetProperties} PlatformTargetProperties */

// [[C:]/path/to/config][:env]
const inputRx = /^(?:((?:[A-Z]:)?[/\\].*?))?(?::(.+?))?$/i;

/**
 * @typedef {Object} BrowserslistHandlerConfig
 * @property {string=} configPath
 * @property {string=} env
 * @property {string=} query
 */

/**
 * @param {string} input input string
 * @param {string} context the context directory
 * @returns {BrowserslistHandlerConfig} config
 */
const parse = (input, context) => {
	if (!input) {
		return {};
	}

	if (path.isAbsolute(input)) {
		const [, configPath, env] = inputRx.exec(input) || [];
		return { configPath, env };
	}

	const config = browserslist.findConfig(context);

	if (config && Object.keys(config).includes(input)) {
		return { env: input };
	}

	return { query: input };
};

/**
 * @param {string} input input string
 * @param {string} context the context directory
 * @returns {string[] | undefined} selected browsers
 */
const load = (input, context) => {
	const { configPath, env, query } = parse(input, context);

	// if a query is specified, then use it, else
	// if a path to a config is specified then load it, else
	// find a nearest config
	const config = query
		? query
		: configPath
		? browserslist.loadConfig({
				config: configPath,
				env
		  })
		: browserslist.loadConfig({ path: context, env });

	if (!config) return null;
	return browserslist(config);
};

/**
 * @param {string[]} browsers supported browsers list
 * @returns {EcmaTargetProperties & PlatformTargetProperties & ApiTargetProperties} target properties
 */
const resolve = browsers => {
	/**
	 * Checks all against a version number
	 * @param {Record<string, number | [number, number]>} versions first supported version
	 * @returns {boolean} true if supports
	 */
	const rawChecker = versions => {
		return browsers.every(v => {
			const [name, parsedVersion] = v.split(" ");
			if (!name) return false;
			const requiredVersion = versions[name];
			if (!requiredVersion) return false;
			const [parsedMajor, parserMinor] =
				// safari TP supports all features for normal safari
				parsedVersion === "TP"
					? [Infinity, Infinity]
					: parsedVersion.split(".");
			if (typeof requiredVersion === "number") {
				return +parsedMajor >= requiredVersion;
			}
			return requiredVersion[0] === +parsedMajor
				? +parserMinor >= requiredVersion[1]
				: +parsedMajor > requiredVersion[0];
		});
	};
	const anyNode = browsers.some(b => /^node /.test(b));
	const anyBrowser = browsers.some(b => /^(?!node)/.test(b));
	const browserProperty = !anyBrowser ? false : anyNode ? null : true;
	const nodeProperty = !anyNode ? false : anyBrowser ? null : true;
	const es6DynamicImport = rawChecker({
		chrome: 63,
		chrome_android: 63,
		edge: 79,
		firefox: 67,
		firefox_android: 67,
		// ie: Not supported,
		// Since Node.js 13.14.0 no warning about usage, but it was added 8.5.0 with some limitations and it was improved in 12.0.0 and 13.2.0
		node: [13, 14],
		opera: 50,
		opera_android: 46,
		safari: [11, 1],
		safari_ios: [11, 3],
		samsunginternet_android: [8, 0],
		webview_android: 63
	});

	return {
		const: rawChecker({
			chrome: 21,
			chrome_android: 25,
			edge: 12,
			// Prior to Firefox 13, <code>const</code> is implemented, but re-assignment is not failing.
			// Prior to Firefox 46, a <code>TypeError</code> was thrown on redeclaration instead of a <code>SyntaxError</code>.
			firefox: 36,
			firefox_android: 36,
			ie: 11,
			node: [6, 0],
			opera: 9,
			opera_android: [10, 1],
			safari: [5, 1],
			safari_ios: 6,
			samsunginternet_android: [1, 5],
			webview_android: 37
		}),
		arrowFunction: rawChecker({
			chrome: 45,
			chrome_android: 45,
			edge: 12,
			// The initial implementation of arrow functions in Firefox made them automatically strict. This has been changed as of Firefox 24. The use of <code>'use strict';</code> is now required.
			// Prior to Firefox 39, a line terminator (<code>\\n</code>) was incorrectly allowed after arrow function arguments. This has been fixed to conform to the ES2015 specification and code like <code>() \\n => {}</code> will now throw a <code>SyntaxError</code> in this and later versions.
			firefox: 39,
			firefox_android: 39,
			// ie: Not supported,
			node: [6, 0],
			opera: 32,
			opera_android: 32,
			safari: 10,
			safari_ios: 10,
			samsunginternet_android: [5, 0],
			webview_android: 45
		}),
		forOf: rawChecker({
			chrome: 38,
			chrome_android: 38,
			edge: 12,
			// Prior to Firefox 51, using the for...of loop construct with the const keyword threw a SyntaxError ("missing = in const declaration").
			firefox: 51,
			firefox_android: 51,
			// ie: Not supported,
			node: [0, 12],
			opera: 25,
			opera_android: 25,
			safari: 7,
			safari_ios: 7,
			samsunginternet_android: [3, 0],
			webview_android: 38
		}),
		destructuring: rawChecker({
			chrome: 49,
			chrome_android: 49,
			edge: 14,
			firefox: 41,
			firefox_android: 41,
			// ie: Not supported,
			node: [6, 0],
			opera: 36,
			opera_android: 36,
			safari: 8,
			safari_ios: 8,
			samsunginternet_android: [5, 0],
			webview_android: 49
		}),
		bigIntLiteral: rawChecker({
			chrome: 67,
			chrome_android: 67,
			edge: 79,
			firefox: 68,
			firefox_android: 68,
			// ie: Not supported,
			node: [10, 4],
			opera: 54,
			opera_android: 48,
			safari: 14,
			safari_ios: 14,
			samsunginternet_android: [9, 0],
			webview_android: 67
		}),
		// Support syntax `import` and `export` and no limitations and bugs on Node.js
		// Not include `export * as namespace`
		module: rawChecker({
			chrome: 61,
			chrome_android: 61,
			edge: 16,
			firefox: 60,
			firefox_android: 60,
			// ie: Not supported,
			// Since Node.js 13.14.0 no warning about usage, but it was added 8.5.0 with some limitations and it was improved in 12.0.0 and 13.2.0
			node: [13, 14],
			opera: 48,
			opera_android: 45,
			safari: [10, 1],
			safari_ios: [10, 3],
			samsunginternet_android: [8, 0]
			// webview_android: Not supported,
		}),

		//	browserslistChecker("es6-module") && rawChecker({ node: [12, 17] }),
		dynamicImport: es6DynamicImport,
		dynamicImportInWorker: es6DynamicImport && !anyNode,
		// browserslist does not have info about globalThis
		// so this is based on mdn-browser-compat-data
		globalThis: rawChecker({
			chrome: 71,
			chrome_android: 71,
			edge: 79,
			firefox: 65,
			firefox_android: 65,
			// ie: Not supported,
			node: [12, 0],
			opera: 58,
			opera_android: 50,
			safari: [12, 1],
			safari_ios: [12, 2],
			samsunginternet_android: [10, 0],
			webview_android: 71
		}),

		browser: browserProperty,
		electron: false,
		node: nodeProperty,
		nwjs: false,
		web: browserProperty,
		webworker: false,

		document: browserProperty,
		fetchWasm: browserProperty,
		global: nodeProperty,
		importScripts: false,
		importScriptsInWorker: true,
		nodeBuiltins: nodeProperty,
		require: nodeProperty
	};
};

module.exports = {
	resolve,
	load
};
