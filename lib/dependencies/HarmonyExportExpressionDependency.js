/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const HarmonyExportInitFragment = require("./HarmonyExportInitFragment");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

class HarmonyExportExpressionDependency extends NullDependency {
	constructor(range, rangeStatement, prefix) {
		super();
		this.range = range;
		this.rangeStatement = rangeStatement;
		this.prefix = prefix;
	}

	get type() {
		return "harmony export expression";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		return {
			exports: ["default"],
			dependencies: undefined
		};
	}

	serialize(context) {
		const { write } = context;
		write(this.range);
		write(this.rangeStatement);
		write(this.prefix);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.range = read();
		this.rangeStatement = read();
		this.prefix = read();
		super.deserialize(context);
	}
}

makeSerializable(
	HarmonyExportExpressionDependency,
	"webpack/lib/dependencies/HarmonyExportExpressionDependency"
);

HarmonyExportExpressionDependency.Template = class HarmonyExportDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ module, moduleGraph, runtimeTemplate, runtimeRequirements, initFragments }
	) {
		const dep = /** @type {HarmonyExportExpressionDependency} */ (dependency);
		const used = module.getUsedName(moduleGraph, "default");
		let content;
		if (used) {
			runtimeRequirements.add(RuntimeGlobals.exports);
			const exportsName = module.exportsArgument;
			if (runtimeTemplate.supportsConst()) {
				const name = "__WEBPACK_DEFAULT_EXPORT__";
				content = `/* harmony default export */ const ${name} = `;
				const map = new Map();
				map.set(used, name);
				initFragments.push(new HarmonyExportInitFragment(exportsName, map));
			} else {
				// This is a little bit incorrect as TDZ is not correct, but we can't use const.
				content = `/* harmony default export */ ${exportsName}[${JSON.stringify(
					used
				)}] = `;
			}
		} else {
			content =
				"/* unused harmony default export */ var _unused_webpack_default_export = ";
		}

		if (dep.range) {
			source.replace(
				dep.rangeStatement[0],
				dep.range[0] - 1,
				content + "(" + dep.prefix
			);
			source.replace(dep.range[1], dep.rangeStatement[1] - 0.5, ");");
			return;
		}

		source.replace(dep.rangeStatement[0], dep.rangeStatement[1] - 1, content);
	}
};

module.exports = HarmonyExportExpressionDependency;
