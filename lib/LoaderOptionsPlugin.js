/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

function LoaderOptionsPlugin(options) {
	if(typeof options !== "object") options = {};
	if(!options.test) options.test = {
		test: function() {
			return true;
		}
	};
	this.options = options;
}
module.exports = LoaderOptionsPlugin;

LoaderOptionsPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("normal-module-loader", function(context, module) {
			var resource = module.resource;
			if(!resource) return;
			var i = resource.indexOf("?");
			if(ModuleFilenameHelpers.matchObject(options, i < 0 ? resource : resource.substr(0, i))) {
				Object.keys(options).filter(function(key) {
					return ["include", "exclude", "test"].indexOf(key) < 0
				}).forEach(function(key) {
					context[key] = options[key];
				});
			}
		});
	});
};
