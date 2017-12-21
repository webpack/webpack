/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Authors Simen Brekken @simenbrekken, Einar Löve @einarlove
*/

"use strict";

const DefinePlugin = require("./DefinePlugin");

class EnvironmentPlugin {
	constructor(...keys) {
		if(keys.length === 1 && Array.isArray(keys[0])) {
			this.keys = keys[0];
			this.defaultValues = {};
		} else if(keys.length === 1 && keys[0] && typeof keys[0] === "object") {
			this.keys = Object.keys(keys[0]);
			this.defaultValues = keys[0];
		} else {
			this.keys = keys;
			this.defaultValues = {};
		}
	}

	apply(compiler) {
		const definitions = this.keys.reduce((defs, key) => {
			const value = process.env[key] !== undefined ? process.env[key] : this.defaultValues[key];

			if(value === undefined) {
				compiler.hooks.thisCompilation.tap("EnvironmentPlugin", (compilation) => {
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

		new DefinePlugin(definitions).apply(compiler);
	}
}

module.exports = EnvironmentPlugin;
