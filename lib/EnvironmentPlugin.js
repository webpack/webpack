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
 * @param {string} importMetaName import meta name
 * @returns {{ definitions: Record<string, CodeValue>, raw: Record<string, CodeValue> }} definitions and collected errors
 */
function toDefinitions(keys, defaultValues, importMetaName) {
	/** @type {Record<string, CodeValue>} */
	const definitions = {};
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

		const defValue = value === undefined ? "undefined" : JSON.stringify(value);

		definitions[`process.env.${key}`] = defValue;
		definitions[`${importMetaName}.env.${key}`] = defValue;
		raw[key] = value;
	}
	return { definitions, raw };
}

class EnvironmentPlugin {
	/**
	 * @param {(string | string[] | Record<string, EXPECTED_ANY>)[]} options options
	 */
	constructor(...options) {
		const { keys, defaultValues } = normalizeOptions(options);
		this.keys = keys;
		this.defaultValues = defaultValues;
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
			const { definitions, raw } = toDefinitions(
				this.keys,
				this.defaultValues,
				importMetaName
			);
			this._defineInstance.updateOptions(definitions);
			this._importMetaEnvInstance.updateOptions(raw);
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

		this.keys = keys;
		this.defaultValues = defaultValues;
	}
}

module.exports = EnvironmentPlugin;
