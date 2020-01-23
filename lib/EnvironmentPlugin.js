/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Authors Simen Brekken @simenbrekken, Einar Löve @einarlove
*/

"use strict";

const DefinePlugin = require("./DefinePlugin");
const WebpackError = require("./WebpackError");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./DefinePlugin").CodeValue} CodeValue */

class EnvironmentPlugin {
	constructor(...keys) {
		this.options = {};
		if (keys.length > 1) {
			const options = keys[keys.length - 1];
			if (typeof options === "object") {
				this.options = options;
				// remove options object from env keys
				keys.pop();
			}
		}

		if (keys.length === 1 && Array.isArray(keys[0])) {
			this.keys = keys[0];
			this.defaultValues = {};
		} else if (keys.length === 1 && keys[0] && typeof keys[0] === "object") {
			this.keys = Object.keys(keys[0]);
			this.defaultValues = keys[0];
		} else {
			this.keys = keys;
			this.defaultValues = {};
		}
	}

	/**
	 * @param {Compiler} compiler webpack compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		/** @type {Record<string, CodeValue>} */
		const definitions = {};
		for (const key of this.keys) {
			const value =
				process.env[key] !== undefined
					? process.env[key]
					: this.defaultValues[key];

			if (value === undefined) {
				compiler.hooks.thisCompilation.tap("EnvironmentPlugin", compilation => {
					const error = new WebpackError(
						`EnvironmentPlugin - ${key} environment variable is undefined.\n\n` +
							"You can pass an object with default values to suppress this warning.\n" +
							"See https://webpack.js.org/plugins/environment-plugin for example."
					);

					error.name = "EnvVariableNotDefinedError";
					if (this.options["errorLevel"] === "error") {
						compilation.errors.push(error);
					} else {
						compilation.warnings.push(error);
					}
				});
			}

			definitions[`process.env.${key}`] =
				value === undefined ? "undefined" : JSON.stringify(value);
		}

		new DefinePlugin(definitions).apply(compiler);
	}
}

module.exports = EnvironmentPlugin;
