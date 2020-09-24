/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

// cspell:word browserslist

const browserslist = require("browserslist");

// [///path/to/config][>/path/to/browserslist][:env]
const inputRx = /^(?:\/\/(.+?))?(?:>(.+?))?(?:\?(.+?))?(?::(.+?))?$/;

/**
 * @typedef {Object} BrowserslistHandlerConfig
 * @property {string} [browserslistPath]
 * @property {string} [configPath]
 * @property {string} [env]
 * @property {string} [query]
 */

/**
 * @param {BrowserslistHandlerConfig|null} handlerConfig config
 * @returns {import("./target").EcmaTargetProperties} es features
 */
const resolve = handlerConfig => {
	const { browserslistPath, configPath, env, query } = handlerConfig || {};
	const localBrowserslist = browserslistPath
		? require(browserslistPath)
		: browserslist;

	// if a query is specified, then use it, else
	// if a path to a config is specified then load it, else
	// find a nearest config
	const config = query
		? query
		: configPath
		? localBrowserslist.loadConfig({
				config: configPath,
				env
		  })
		: localBrowserslist.loadConfig({ path: process.cwd(), env });

	const browsers = localBrowserslist(config);
	const checker = createChecker(localBrowserslist, browsers);

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

	const [, configPath, browserslistPath, query, env] =
		inputRx.exec(input) || [];

	return { configPath, browserslistPath, query, env };
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
 * @param {browserslist} browserslist browserslist module
 * @param {string[]} browsers supported browsers list
 * @returns {function(string):boolean} checker
 */
const createChecker = (browserslist, browsers) => {
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
