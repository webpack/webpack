/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Authors Simen Brekken @simenbrekken, Einar Löve @einarlove
*/
var DefinePlugin = require("./DefinePlugin");

function EnvironmentPlugin(keys) {
	this.defaultValues = {};

	if(Array.isArray(keys)) {
		this.keys = keys;
	} else if(keys && typeof keys === "object") {
		this.keys = Object.keys(keys);
		this.defaultValues = keys;
	} else {
		this.keys = Array.prototype.slice.call(arguments);
	}
}

EnvironmentPlugin.prototype.apply = function(compiler) {
	var definitions = this.keys.reduce(function(defs, key) {
		var value = process.env[key] || this.defaultValues[key];

		if(value === undefined) {
			compiler.plugin("this-compilation", function(compilation) {
				var error = new Error(
					'EnvironmentPlugin - ' + key + ' environment variable is undefined. \n\n' +
					'You can pass an object with default values to suppress this warning. \n' +
					'See http://webpack.github.io/docs/list-of-plugins.html#environmentplugin for example.'
				);

				error.name = "EnvVariableNotDefinedError";
				compilation.warnings.push(error);
			});
		}

		defs["process.env." + key] = value === 'undefined' ? 'undefined' : JSON.stringify(value);

		return defs;
	}.bind(this), {});

	compiler.apply(new DefinePlugin(definitions));
};

module.exports = EnvironmentPlugin;
