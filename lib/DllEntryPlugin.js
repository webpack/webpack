/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DllEntryDependency = require("./dependencies/DllEntryDependency");
var SingleEntryDependency = require("./dependencies/SingleEntryDependency");
var DllModuleFactory = require("./DllModuleFactory");

function DllEntryPlugin(context, entries, name, type) {
	this.context = context;
	this.entries = entries;
	this.name = name;
	this.type = type;
}
module.exports = DllEntryPlugin;
DllEntryPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var dllModuleFactory = new DllModuleFactory();
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(DllEntryDependency, dllModuleFactory);

		compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
	});
	compiler.plugin("make", function(compilation, callback) {
		compilation.addEntry(this.context, new DllEntryDependency(this.entries.map(function(e, idx) {
			var dep = new SingleEntryDependency(e);
			dep.loc = this.name + ":" + idx;
			return dep;
		}, this), this.name, this.type), this.name, callback);
	}.bind(this));
};
