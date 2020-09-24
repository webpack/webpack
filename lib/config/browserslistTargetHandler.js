/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const browserslist = require("browserslist");
const path = require("path");

// [[C:]/path/to/config][:env]
const inputRx = /^(?:((?:[A-Z]:)?[/\\].*?))?(?::(.+?))?$/i;

/**
 * @typedef {Object} BrowserslistHandlerConfig
 * @property {string} [configPath]
 * @property {string} [env]
 * @property {string} [query]
 */

/**
 * @param {BrowserslistHandlerConfig|null} handlerConfig config
 * @returns {import("./target").EcmaTargetProperties} es features
 */
const resolve = handlerConfig => {
	const { configPath, env, query } = handlerConfig || {};

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
		: browserslist.loadConfig({ path: process.cwd(), env });

	const browsers = browserslist(config);
	const checker = createChecker(browsers);

	return resolveESFeatures(checker);
};

/**
 * @param {string} input input string
 * @returns {BrowserslistHandlerConfig|null} config
 */
const parse = input => {
	if (!input) {
		return null;
	}

	if (path.isAbsolute(input)) {
		const [, configPath, env] = inputRx.exec(input) || [];
		return { configPath, env };
	}

	const config = browserslist.findConfig(process.cwd());

	if (config && Object.keys(config).includes(input)) {
		return { env: input };
	}

	return { query: input };
};

/**
 * @param {function(string): boolean} checker checker function
 * @returns {import("./target").EcmaTargetProperties} es features
 */
const resolveESFeatures = checker => {
	return {
		const: checker("es6"),
		arrowFunction: checker("es6"),
		forOf: checker("es6"),
		destructuring: checker("es6"),
		bigIntLiteral: checker("bigint"),
		module: checker("es6-module"),
		dynamicImport: checker("es6-module-dynamic-import"),
		dynamicImportInWorker: checker("es6-module-dynamic-import"),
		// browserslist does not have info about globalThis
		globalThis: undefined
	};
};

/**
 * Create browserslist checker
 * @param {string[]} browsers supported browsers list
 * @returns {function(string):boolean} checker
 */
const createChecker = browsers => {
	/**
	 * @param {string} feature an ES feature to test
	 * @returns {boolean} true if supports
	 */
	return feature => {
		const supportsFeature = browserslist(`supports ${feature}`);
		return browsers.every(v => supportsFeature.includes(v));
	};
};

module.exports = {
	resolve,
	parse
};
