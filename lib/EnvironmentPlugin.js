/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Simen Brekken @simenbrekken
*/
var DefinePlugin = require("./DefinePlugin");

function EnvironmentPlugin(keys) {
	this.keys = Array.isArray(keys) ? keys : Array.prototype.slice.call(arguments);
}
module.exports = EnvironmentPlugin;

EnvironmentPlugin.prototype.apply = function(compiler) {
	compiler.apply(new DefinePlugin(this.keys.reduce(function(definitions, key) {
		var value = process.env[key];

		if(value === undefined) {
			compiler.plugin("this-compilation", function(compilation) {
				var error = new Error(key + " environment variable is undefined.");
				error.name = "EnvVariableNotDefinedError";
				compilation.warnings.push(error);
			});
		}

		definitions["process.env." + key] = value ? JSON.stringify(value) : "undefined";

		return definitions;
	}, {})));
};
