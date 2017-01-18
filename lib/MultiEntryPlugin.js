/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const MultiEntryDependency = require("./dependencies/MultiEntryDependency");
const SingleEntryDependency = require("./dependencies/SingleEntryDependency");
const MultiModuleFactory = require("./MultiModuleFactory");

module.exports = class MultiEntryPlugin {
	constructor(context, entries, name) {
		this.context = context;
		this.entries = entries;
		this.name = name;
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			const multiModuleFactory = new MultiModuleFactory();
			const normalModuleFactory = params.normalModuleFactory;

			compilation.dependencyFactories.set(MultiEntryDependency, multiModuleFactory);
			compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
		});
		compiler.plugin("make", (compilation, callback) => {
			const dep = MultiEntryPlugin.createDependency(this.entries, this.name);
			compilation.addEntry(this.context, dep, this.name, callback);
		});
	}

	static createDependency(entries, name) {
		return new MultiEntryDependency(entries.map((e, idx) => {
			const dep = new SingleEntryDependency(e);
			dep.loc = name + ":" + (100000 + idx);
			return dep;
		}), name);
	}
};
