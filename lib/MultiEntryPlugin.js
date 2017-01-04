"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const MultiEntryDependency = require("./dependencies/MultiEntryDependency");
const SingleEntryDependency = require("./dependencies/SingleEntryDependency");
const MultiModuleFactory = require("./MultiModuleFactory");
class MultiEntryPlugin {
	constructor(context, entries, name) {
		this.context = context;
		this.entries = entries;
		this.name = name;
	}

	apply(compiler) {
		compiler.plugin("compilation", function(compilation, params) {
			const multiModuleFactory = new MultiModuleFactory();
			const normalModuleFactory = params.normalModuleFactory;
			compilation.dependencyFactories.set(MultiEntryDependency, multiModuleFactory);
			compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
		});
		compiler.plugin("make", (compilation, callback) => {
			compilation.addEntry(this.context, new MultiEntryDependency(this.entries.map(function(e, idx) {
				const dep = new SingleEntryDependency(e);
				dep.loc = `${this.name}:${100000 + idx}`;
				return dep;
			}, this), this.name), this.name, callback);
		});
	}
}
module.exports = MultiEntryPlugin;
