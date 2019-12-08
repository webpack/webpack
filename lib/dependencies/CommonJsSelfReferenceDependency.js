/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { UsageState } = require("../ModuleGraph");
const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const propertyAccess = require("../util/propertyAccess");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

class CommonJsSelfReferenceDependency extends NullDependency {
	constructor(range, base, names) {
		super();
		this.range = range;
		this.base = base;
		this.names = names;
	}

	get type() {
		return "cjs self exports reference";
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `self`;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {string[][]} referenced exports
	 */
	getReferencedExports(moduleGraph) {
		return [this.names];
	}

	serialize(context) {
		const { write } = context;
		write(this.range);
		write(this.base);
		write(this.names);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.range = read();
		this.base = read();
		this.names = read();
		super.deserialize(context);
	}
}

makeSerializable(
	CommonJsSelfReferenceDependency,
	"webpack/lib/dependencies/CommonJsSelfReferenceDependency"
);

CommonJsSelfReferenceDependency.Template = class CommonJsSelfReferenceDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ module, moduleGraph, initFragments, runtimeRequirements }
	) {
		const dep = /** @type {CommonJsSelfReferenceDependency} */ (dependency);
		let used;
		if (dep.names.length === 0) {
			used = dep.names;
		} else if (module.buildMeta && module.buildMeta.exportsType === "default") {
			const defaultInfo = moduleGraph.getExportInfo(module, "default");
			if (defaultInfo.used === UsageState.Used) {
				used = dep.names;
			} else {
				used = defaultInfo.exportsInfo.getUsedName(dep.names);
			}
		} else {
			used = moduleGraph.getExportsInfo(module).getUsedName(dep.names);
		}
		if (!used) {
			throw new Error(
				"Self-reference dependency has unused export name: This should not happen"
			);
		}

		let base = undefined;
		switch (dep.base) {
			case "exports":
				runtimeRequirements.add(RuntimeGlobals.exports);
				base = module.exportsArgument;
				break;
			case "module.exports":
				runtimeRequirements.add(RuntimeGlobals.module);
				base = `${module.moduleArgument}.exports`;
				break;
			case "this":
				runtimeRequirements.add(RuntimeGlobals.thisAsExports);
				base = "this";
				break;
			default:
				throw new Error(`Unsupported base ${dep.base}`);
		}

		if (base === dep.base && used.join() === dep.names.join()) {
			// Nothing has to be changed
			// We don't use a replacement for compat reasons
			// for plugins that update `module._source` which they
			// shouldn't do!
			return;
		}

		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			`/* self exports access */ ${base}${propertyAccess(used)}`
		);
	}
};

module.exports = CommonJsSelfReferenceDependency;
