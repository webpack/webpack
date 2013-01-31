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
MultiEntryPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var multiModuleFactory = new MultiModuleFactory();
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(MultiEntryDependency, multiModuleFactory);

		compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
	});
	compiler.plugin("make", function(compilation, callback) {
		compilation.addEntry(this.context, new MultiEntryDependency(this.entries.map(function(e) {
			return new SingleEntryDependency(e);
		}), this.name), this.name, callback);
	}.bind(this));
};