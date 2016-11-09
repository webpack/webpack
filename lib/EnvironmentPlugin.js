/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Simen Brekken @simenbrekken
*/
var DefinePlugin = require("./DefinePlugin");


	this.keys = Array.isArray(keys) ? keys : Object.keys(keys);
	this.defaultValues = Array.isArray(keys) ? {} : keys;
}

EnvironmentPlugin.prototype.apply = function(compiler) {
	compiler.apply(new DefinePlugin(this.keys.reduce(function(definitions, key) {
		var value = process.env[key] || this.defaultValues[key];

		if(value === undefined && !this.silent) {
			compiler.plugin("this-compilation", function(compilation) {
				var error = new Error(key + " environment variable is undefined.");
				error.name = "EnvVariableNotDefinedError";
				compilation.warnings.push(error);
			});
		}

		definitions["process.env." + key] = value ? JSON.stringify(value) : "undefined";

		return definitions;
	}.bind(this), {})));
};

module.exports = EnvironmentPlugin;
