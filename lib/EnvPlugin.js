/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Simen Brekken @simenbrekken
*/
var DefinePlugin = require("./DefinePlugin");

function EnvPlugin(keys) {
	this.keys = Array.isArray(keys) ? keys : Array.prototype.slice.call(arguments);
}
module.exports = EnvPlugin;

EnvPlugin.prototype.apply = function(compiler) {
	compiler.apply(new DefinePlugin(getDefinitions(this.keys)));

	function getDefinitions(keys) {
		return keys.reduce(function(definitions, key) {
			var value = process.env[key];

			if (value === undefined) {
				compiler.plugin("compilation", function(compilation) {
					var error = new Error(key + " environment variable is undefined.");
					error.name = "EnvVariableNotDefinedError";
					compilation.warnings.push(error);
				});
			}

			definitions["process.env." + key] = value ? JSON.stringify(value) : "undefined";

			return definitions;
		}, {});
	}
};
