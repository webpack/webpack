/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var async = require("async");
var SingleEntryDependency = require("./dependencies/SingleEntryDependency");
var MultiEntryDependency = require("./dependencies/MultiEntryDependency");
var MultiModuleFactory = require("./MultiModuleFactory");

function EntryOptionPlugin() {}
module.exports = EntryOptionPlugin;

EntryOptionPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		Object.keys(compiler.entry).forEach(function(name) {
			var entry = compiler.entry[name];
			if (Array.isArray(entry)) {
				var multiModuleFactory = new MultiModuleFactory();
				compilation.dependencyFactories.set(MultiEntryDependency, multiModuleFactory);
			}

			var normalModuleFactory = params.normalModuleFactory;
			compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
		});
	});

	compiler.plugin("make", function(compilation, callback) {
		async.forEach(Object.keys(compiler.entry), function(name, cb) {
			var dep;
			var entry = compiler.entry[name];
			if (Array.isArray(entry)) {
				dep = new MultiEntryDependency(entry.map(function(e, idx) {
					var d = new SingleEntryDependency(e);
					d.loc = name + ":" + (100000 + idx);
					return d;
				}), name);
			} else {
				dep = new SingleEntryDependency(entry);
				dep.loc = name;
			}

			compilation.addEntry(compiler.context, dep, name, cb);
		}, callback);

	});
};
