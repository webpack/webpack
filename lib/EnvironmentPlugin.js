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
 * @returns {{ definitions: Record<string, CodeValue>, errors: Error[], raw: Record<string, CodeValue> }} definitions and collected errors
 */
function toDefinitions(keys, defaultValues) {
	/** @type {Record<string, CodeValue>} */
	const definitions = {};
	/** @type {Record<string, CodeValue>} */
	const raw = {};
	/** @type {Error[]} */
	const errors = [];
	for (const key of keys) {
		const value =
			process.env[key] !== undefined ? process.env[key] : defaultValues[key];

		if (value === undefined) {
			errors.push(
				new WebpackError(
					`${PLUGIN_NAME} - ${key} environment variable is undefined.\n\n` +
						"You can pass an object with default values to suppress this warning.\n" +
						"See https://webpack.js.org/plugins/environment-plugin for example."
				)
			);
		}

		const defValue = value === undefined ? "undefined" : JSON.stringify(value);

		definitions[`process.env.${key}`] = defValue;
		definitions[`import.meta.env.${key}`] = defValue;
		raw[key] = value;
	}
	return { definitions, errors, raw };
}

class EnvironmentPlugin {
	/**
	 * @param {(string | string[] | Record<string, EXPECTED_ANY>)[]} options options
	 */
	constructor(...options) {
		const { keys, defaultValues } = normalizeOptions(options);
		const { definitions, errors, raw } = toDefinitions(keys, defaultValues);

		this.keys = keys;
		this.defaultValues = defaultValues;
		this._errors = errors;
		this._defineInstance = new DefinePlugin(definitions);
		this._importMetaEnvInstance = new ImportMetaEnvPlugin(raw);
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			for (const error of this._errors) {
				compilation.errors.push(error);
			}
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
		const { definitions, errors, raw } = toDefinitions(keys, defaultValues);

		this.keys = keys;
		this.defaultValues = defaultValues;
		this._errors = errors;
		this._defineInstance.updateOptions(definitions);
		this._importMetaEnvInstance.updateOptions(raw);
	}
}

module.exports = EnvironmentPlugin;
