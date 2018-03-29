/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const SingleEntryDependency = require("./dependencies/SingleEntryDependency");

class SingleEntryPlugin {
	constructor(context, entry, name) {
		this.context = context;
		this.entry = entry;
		this.name = name;
	}

	apply(compiler) {
		compiler.hooks.compilation.tap(
			"SingleEntryPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					SingleEntryDependency,
					normalModuleFactory
				);
			}
		);

		compiler.hooks.make.tapAsync(
			"SingleEntryPlugin",
			(compilation, callback) => {
				const { entry, name, context } = this;

				const dep = SingleEntryPlugin.createDependency(entry, name);
				compilation.addEntry(context, dep, name, callback);
			}
		);
	}

	static createDependency(entry, name) {
		const dep = new SingleEntryDependency(entry);
		dep.loc = name;
		return dep;
	}
}

module.exports = SingleEntryPlugin;
