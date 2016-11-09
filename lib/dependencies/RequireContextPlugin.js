/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RequireContextDependency = require("./RequireContextDependency");
var ContextElementDependency = require("./ContextElementDependency");

var RequireContextDependencyParserPlugin = require("./RequireContextDependencyParserPlugin");

function RequireContextPlugin(modulesDirectories, extensions) {
	this.modulesDirectories = modulesDirectories;
	this.extensions = extensions;
}
module.exports = RequireContextPlugin;

RequireContextPlugin.prototype.apply = function(compiler) {
	var modulesDirectories = this.modulesDirectories;
	var extensions = this.extensions;
	compiler.plugin("compilation", function(compilation, params) {
		var contextModuleFactory = params.contextModuleFactory;
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(RequireContextDependency, contextModuleFactory);
		compilation.dependencyTemplates.set(RequireContextDependency, new RequireContextDependency.Template());

		compilation.dependencyFactories.set(ContextElementDependency, normalModuleFactory);
	});
	compiler.plugin("context-module-factory", function(cmf) {
		cmf.plugin("alternatives", function(items, callback) {
			if(items.length === 0) return callback(null, items);

			callback(null, items.map(function(obj) {
				return extensions.filter(function(ext) {
					var l = obj.request.length;
					return l > ext.length && obj.request.substr(l - ext.length, l) === ext;
				}).map(function(ext) {
					var l = obj.request.length;
					return {
						context: obj.context,
						request: obj.request.substr(0, l - ext.length)
					};
				});
			}).reduce(function(a, b) {
				return a.concat(b);
			}, []));
		});
		cmf.plugin("alternatives", function(items, callback) {
			if(items.length === 0) return callback(null, items);

			callback(null, items.map(function(obj) {
				for(var i = 0; i < modulesDirectories.length; i++) {
					var dir = modulesDirectories[i];
					var idx = obj.request.indexOf("./" + dir + "/");
					if(idx === 0) {
						obj.request = obj.request.slice(dir.length + 3);
						break;
					}
				}
				return obj;
			}));
		});
	});
	new RequireContextDependencyParserPlugin().apply(compiler.parser);
};
