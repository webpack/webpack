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
	 * Checks only browser against the browserslist feature query
	 * @param {string} feature an ES feature to test
	 * @returns {boolean} true if supports
	 */
	const browserslistChecker = feature => {
		const supportsFeature = browserslist(`supports ${feature}`);
		return browsers.every(v => /^node /.test(v) || supportsFeature.includes(v));
	};
	/**
	 * Checks only node.js version against a version
	 * @param {number} major major version
	 * @param {number} minor minor version
	 * @returns {boolean} true if supports
	 */
	const nodeChecker = (major, minor = 0) => {
		return browsers.every(v => {
			const match = /^node (\d+)(?:\.\d+)?/.exec(v);
			if (!match) return true;
			const [, v1, v2] = match;
			return major === +v1 ? +v2 >= minor : +v1 > major;
		});
	};
	/**
	 * Checks all against a version number
	 * @param {Record<string, number | [number, number]>} versions first supported version
	 * @returns {boolean} true if supports
	 */
	const rawChecker = versions => {
		return browsers.every(v => {
			const match = /^([^ ]+) (\d+)(?:\.\d+)?/.exec(v);
			if (!match) return false;
			const [, name, major, minor] = match;
			const version = versions[name];
			if (!version) return false;
			if (typeof version === "number") return +major >= version;
			return version[0] === +major ? +minor >= version[1] : +major > version[0];
		});
	};
	const anyNode = browsers.some(b => /^node /.test(b));
	const anyBrowser = browsers.some(b => /^(?!node)/.test(b));
	const browserProperty = !anyBrowser ? false : anyNode ? null : true;
	const nodeProperty = !anyNode ? false : anyBrowser ? null : true;
	const es6 = browserslistChecker("es6");
	const es6DynamicImport = browserslistChecker("es6-module-dynamic-import");
	const node6 = nodeChecker(6);
	return {
		const: es6 && node6,
		arrowFunction: es6 && node6,
		forOf: es6 && nodeChecker(5),
		destructuring: es6 && node6,
		bigIntLiteral: browserslistChecker("bigint") && nodeChecker(10, 4),
		module: browserslistChecker("es6-module") && nodeChecker(12, 17),
		dynamicImport: es6DynamicImport && nodeChecker(10, 17),
		dynamicImportInWorker: es6DynamicImport && nodeChecker(Infinity),
		// browserslist does not have info about globalThis
		// so this is based on mdn-browser-compat-data
		globalThis: rawChecker({
			chrome: 71,
			chrome_android: 71,
			edge: 79,
			firefox: 65,
			firefox_android: 65,
			// ie: Not supported,
			nodejs: 12,
			opera: 58,
			opera_android: 50,
			safari: [12, 1],
			safari_ios: [12, 2],
			// cspell:word samsunginternet
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
