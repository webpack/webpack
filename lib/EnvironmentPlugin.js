/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Simen Brekken @simenbrekken
*/

"use strict";

const DefinePlugin = require("./DefinePlugin");

class EnvironmentPlugin {
	constructor(keys) {
		this.keys = Array.isArray(keys) ? keys : Array.prototype.slice.call(arguments);
	}

	apply(compiler) {
		compiler.apply(new DefinePlugin(this.keys.reduce((definitions, key) => {
			const value = process.env[key];

			if(value === undefined) {
				compiler.plugin("this-compilation", (compilation) => {
					const error = new Error(key + " environment variable is undefined.");
					error.name = "EnvVariableNotDefinedError";
					compilation.warnings.push(error);
				});
			}

			definitions["process.env." + key] = value ? JSON.stringify(value) : "undefined";

			return definitions;
		}, {})));
	}
}

module.exports = EnvironmentPlugin;
