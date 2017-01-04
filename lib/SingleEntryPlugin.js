"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const SingleEntryDependency = require("./dependencies/SingleEntryDependency");
class SingleEntryPlugin {
	constructor(context, entry, name) {
		this.context = context;
		this.entry = entry;
		this.name = name;
	}

	apply(compiler) {
		compiler.plugin("compilation", function(compilation, params) {
			const normalModuleFactory = params.normalModuleFactory;
			compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
		});
		compiler.plugin("make", (compilation, callback) => {
			const dep = new SingleEntryDependency(this.entry);
			dep.loc = this.name;
			compilation.addEntry(this.context, dep, this.name, callback);
		});
	}
}
module.exports = SingleEntryPlugin;
