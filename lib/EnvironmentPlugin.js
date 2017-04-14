/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Authors Simen Brekken @simenbrekken, Einar Löve @einarlove
*/

"use strict";

const DefinePlugin = require("./DefinePlugin");

class EnvironmentPlugin {
	constructor(keys) {
		if(Array.isArray(keys)) {
			this.keys = keys;
			this.defaultValues = {};
		} else if(keys && typeof keys === "object") {
			this.keys = Object.keys(keys);
			this.defaultValues = keys;
		} else {
			this.keys = Array.prototype.slice.call(arguments);
			this.defaultValues = {};
		}
	}

	apply(compiler) {
		const definitions = this.keys.reduce((defs, key) => {
			const value = process.env[key] !== undefined ? process.env[key] : this.defaultValues[key];

			if(value === undefined) {
				compiler.plugin("this-compilation", compilation => {
					const error = new Error(
						`EnvironmentPlugin - ${key} environment variable is undefined.\n\n` +
						"You can pass an object with default values to suppress this warning.\n" +
						"See https://webpack.js.org/plugins/environment-plugin for example."
					);

					error.name = "EnvVariableNotDefinedError";
					compilation.warnings.push(error);
				});
			}

			defs[`process.env.${key}`] = typeof value === "undefined" ? "undefined" : JSON.stringify(value);

			return defs;
		}, {});

		compiler.apply(new DefinePlugin(definitions));
	}
}

module.exports = EnvironmentPlugin;
