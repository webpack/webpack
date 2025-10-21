/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Authors Simen Brekken @simenbrekken, Einar Löve @einarlove
*/

"use strict";

const DefinePlugin = require("./DefinePlugin");
const WebpackError = require("./WebpackError");
const ImportMetaEnvPlugin = require("./dependencies/ImportMetaEnvPlugin");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./DefinePlugin").CodeValue} CodeValue */

const PLUGIN_NAME = "EnvironmentPlugin";

/**
 * Normalize constructor options into keys and default values.
 * @param {(string | string[] | Record<string, EXPECTED_ANY>)[]} keys keys
 * @returns {{ keys: string[], defaultValues: Record<string, EXPECTED_ANY> }} normalized result
 */
function normalizeOptions(keys) {
	if (keys.length === 1 && Array.isArray(keys[0])) {
		/** @type {string[]} */
		const normalizedKeys = keys[0];
		return {
			keys: normalizedKeys,
			defaultValues: {}
		};
	} else if (keys.length === 1 && keys[0] && typeof keys[0] === "object") {
		/** @type {Record<string, EXPECTED_ANY>} */
		const defaults = /** @type {Record<string, EXPECTED_ANY>} */ (keys[0]);
		return {
			keys: Object.keys(defaults),
			defaultValues: defaults
		};
	}
	/** @type {string[]} */
	const normalized = /** @type {string[]} */ (keys);
	return {
		keys: normalized,
		defaultValues: {}
	};
}

/**
 * Build DefinePlugin definitions from keys and defaults.
 * @param {string[]} keys keys
 * @param {Record<string, EXPECTED_ANY>} defaultValues default values
 * @returns {Record<string, CodeValue>} raw
 */
function toEnv(keys, defaultValues) {
	/** @type {Record<string, CodeValue>} */
	const raw = {};
	for (const key of keys) {
		const value =
			process.env[key] !== undefined ? process.env[key] : defaultValues[key];

		if (value === undefined) {
			throw new WebpackError(
				`${PLUGIN_NAME} - ${key} environment variable is undefined.\n\n` +
					"You can pass an object with default values to suppress this warning.\n" +
					"See https://webpack.js.org/plugins/environment-plugin for example."
			);
		}

		raw[key] = value;
	}
	return raw;
}

/**
 * @param {Record<string, CodeValue>} env env
 * @param {string} importMetaName import meta name
 * @returns {Record<string, CodeValue>} define
 */
function envToDefine(env, importMetaName) {
	/** @type {Record<string, CodeValue>} */
	const define = {};
	for (const [key, value] of Object.entries(env)) {
		define[`process.env.${key}`] = JSON.stringify(value);
	}
	return define;
}

class EnvironmentPlugin {
	/**
	 * @param {(string | string[] | Record<string, EXPECTED_ANY>)[]} options options
	 */
	constructor(...options) {
		const { keys, defaultValues } = normalizeOptions(options);
		this._env = toEnv(keys, defaultValues);
		this._defineInstance = new DefinePlugin({});
		this._importMetaEnvInstance = new ImportMetaEnvPlugin({});
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const importMetaName = compilation.outputOptions.importMetaName;

			this._defineInstance.updateOptions(
				envToDefine(this._env, importMetaName)
			);
			this._importMetaEnvInstance.updateOptions(this._env);
		});

		this._defineInstance.apply(compiler);
		this._importMetaEnvInstance.apply(compiler);
	}

	/**
	 * @param {(string | string[] | Record<string, EXPECTED_ANY>)[]} options options
	 * @returns {void}
	 */
	updateOptions(options) {
		const { keys, defaultValues } = normalizeOptions(options);
		this._env = toEnv(keys, defaultValues);
	}
}

module.exports = EnvironmentPlugin;
