/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Authors Simen Brekken @simenbrekken, Einar Löve @einarlove
*/
var DefinePlugin = require("./DefinePlugin");

function EnvironmentPlugin(keys) {
	if (typeof keys === 'string') {
		throw new Error(
			"Deprecation notice: EnvironmentPlugin now only takes a single argument."
			+ " Either an array of keys or object with default values."
			+ "\nSee http://webpack.github.io/docs/list-of-plugins.html#environmentplugin for example."
		);
	}

	this.keys = Array.isArray(keys) ? keys : Object.keys(keys);
	this.defaultValues = Array.isArray(keys) ? {} : keys;
}

EnvironmentPlugin.prototype.apply = function(compiler) {
	compiler.apply(new DefinePlugin(this.keys.reduce(function(definitions, key) {
		var value = process.env[key] || this.defaultValues[key];

		if(value === undefined) {
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
