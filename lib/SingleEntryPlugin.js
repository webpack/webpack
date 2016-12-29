/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SingleEntryDependency = require("./dependencies/SingleEntryDependency");

function SingleEntryPlugin(context, entry, name) {
	this.context = context;
	this.entry = entry;
	this.name = name;
}
module.exports = SingleEntryPlugin;
SingleEntryPlugin.createDependency = function(entry, name) {
	var dep = new SingleEntryDependency(entry);
	dep.loc = name;
	return dep;
};
SingleEntryPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
	});
	compiler.plugin("make", function(compilation, callback) {
		var dep = SingleEntryPlugin.createDependency(this.entry, this.name);
		compilation.addEntry(this.context, dep, this.name, callback);
	}.bind(this));
};
