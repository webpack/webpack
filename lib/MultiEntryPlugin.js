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
		compiler.hooks.compilation.tap(
			"MultiEntryPlugin",
			(compilation, { normalModuleFactory }) => {
				const multiModuleFactory = new MultiModuleFactory();

				compilation.dependencyFactories.set(
					MultiEntryDependency,
					multiModuleFactory
				);
				compilation.dependencyFactories.set(
					SingleEntryDependency,
					normalModuleFactory
				);
			}
		);

		compiler.hooks.make.tapAsync(
			"MultiEntryPlugin",
			(compilation, callback) => {
				const { context, entries, name } = this;

				const dep = MultiEntryPlugin.createDependency(entries, name);
				compilation.addEntry(context, dep, name, callback);
			}
		);
	}

	static createDependency(entries, name) {
		return new MultiEntryDependency(
			entries.map((e, idx) => {
				const dep = new SingleEntryDependency(e);
				// Because entrypoints are not dependencies found in an
				// existing module, we give it a synthetic id
				dep.loc = `${name}:${100000 + idx}`;
				return dep;
			}),
			name
		);
	}
};
