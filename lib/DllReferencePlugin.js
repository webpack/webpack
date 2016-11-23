/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DelegatedSourceDependency = require("./dependencies/DelegatedSourceDependency");
var DelegatedModuleFactoryPlugin = require("./DelegatedModuleFactoryPlugin");
var ExternalModuleFactoryPlugin = require("./ExternalModuleFactoryPlugin");

function DllReferencePlugin(options) {
	this.options = options;
}
module.exports = DllReferencePlugin;
DllReferencePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(DelegatedSourceDependency, normalModuleFactory);
	});
	compiler.plugin("before-compile", function(params, callback) {
		var manifest = this.options.manifest;
		if(typeof manifest === "string") {
			params.compilationDependencies.push(manifest);
			compiler.inputFileSystem.readFile(manifest, function(err, result) {
				if(err) return callback(err);
				params["dll reference " + manifest] = JSON.parse(result.toString("utf-8"));
				return callback();
			});
		} else {
			return callback();
		}
	}.bind(this));
	compiler.plugin("compile", function(params) {
		var manifest = this.options.manifest;
		if(typeof manifest === "string") {
			manifest = params["dll reference " + manifest];
		}
		var name = this.options.name || manifest.name;
		var sourceType = this.options.sourceType || "var";
		var externals = {};
		var source = "dll-reference " + name;
		externals[source] = name;
		params.normalModuleFactory.apply(new ExternalModuleFactoryPlugin(sourceType, externals));
		params.normalModuleFactory.apply(new DelegatedModuleFactoryPlugin({
			source: source,
			type: this.options.type,
			scope: this.options.scope,
			context: this.options.context || compiler.options.context,
			content: this.options.content || manifest.content,
			extensions: this.options.extensions
		}));
	}.bind(this));
};
