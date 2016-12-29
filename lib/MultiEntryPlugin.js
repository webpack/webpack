/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var MultiEntryDependency = require("./dependencies/MultiEntryDependency");
var SingleEntryDependency = require("./dependencies/SingleEntryDependency");
var MultiModuleFactory = require("./MultiModuleFactory");

function MultiEntryPlugin(context, entries, name) {
	this.context = context;
	this.entries = entries;
	this.name = name;
}
module.exports = MultiEntryPlugin;
MultiEntryPlugin.createDependency = function(entries, name) {
	return new MultiEntryDependency(entries.map(function(e, idx) {
		var dep = new SingleEntryDependency(e);
		dep.loc = name + ":" + (100000 + idx);
		return dep;
	}, this), name);
};
MultiEntryPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var multiModuleFactory = new MultiModuleFactory();
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(MultiEntryDependency, multiModuleFactory);

		compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
	});
	compiler.plugin("make", function(compilation, callback) {
		var dep = MultiEntryPlugin.createDependency(this.entries, this.name);
		compilation.addEntry(this.context, dep, this.name, callback);
	}.bind(this));
};
