/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { UsageState } = require("../ModuleGraph");
const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../util/Hash")} Hash */

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the module
 * @param {string | null} exportName name of the export if any
 * @param {string | null} property name of the requested property
 * @returns {any} value of the property
 */
const getProperty = (moduleGraph, module, exportName, property) => {
	if (!exportName) {
		switch (property) {
			case "usedExports": {
				const usedExports = moduleGraph.getExportsInfo(module).getUsedExports();
				if (typeof usedExports === "boolean" || usedExports === undefined)
					return usedExports;
				return Array.from(usedExports).sort();
			}
		}
	}
	switch (property) {
		case "used":
			return (
				moduleGraph.getExportsInfo(module).isExportUsed(exportName) !==
				UsageState.Unused
			);
		case "useInfo": {
			const state = moduleGraph.getExportsInfo(module).isExportUsed(exportName);
			switch (state) {
				case UsageState.Used:
				case UsageState.OnlyPropertiesUsed:
					return true;
				case UsageState.Unused:
					return false;
				case UsageState.NoInfo:
					return undefined;
				case UsageState.Unknown:
					return null;
				default:
					throw new Error(`Unexpected UsageState ${state}`);
			}
		}
		case "provideInfo":
			return moduleGraph.getExportsInfo(module).isExportProvided(exportName);
	}
	return undefined;
};

class ExportsInfoDependency extends NullDependency {
	constructor(range, exportName, property) {
		super();
		this.range = range;
		this.exportName = exportName;
		this.property = property;
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		const { moduleGraph } = chunkGraph;
		const module = moduleGraph.getParentModule(this);
		const value = getProperty(
			moduleGraph,
			module,
			this.exportName,
			this.property
		);
		hash.update(value === undefined ? "undefined" : JSON.stringify(value));
	}

	serialize(context) {
		const { write } = context;
		write(this.range);
		write(this.exportName);
		write(this.property);
		super.serialize(context);
	}

	static deserialize(context) {
		const obj = new ExportsInfoDependency(
			context.read(),
			context.read(),
			context.read()
		);
		obj.deserialize(context);
		return obj;
	}
}

makeSerializable(
	ExportsInfoDependency,
	"webpack/lib/dependencies/ExportsInfoDependency"
);

ExportsInfoDependency.Template = class ExportsInfoDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { module, moduleGraph, runtimeRequirements }) {
		const dep = /** @type {ExportsInfoDependency} */ (dependency);

		const value = getProperty(
			moduleGraph,
			module,
			dep.exportName,
			dep.property
		);
		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			value === undefined ? "undefined" : JSON.stringify(value)
		);
	}
};

module.exports = ExportsInfoDependency;
