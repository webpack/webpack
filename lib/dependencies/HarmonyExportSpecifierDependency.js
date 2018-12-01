/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

class HarmonyExportSpecifierDependency extends NullDependency {
	constructor(id, name) {
		super();
		this.id = id;
		this.name = name;
	}

	get type() {
		return "harmony export specifier";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		return {
			exports: [this.name],
			dependencies: undefined
		};
	}

	serialize(context) {
		const { write } = context;
		write(this.id);
		write(this.name);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.id = read();
		this.name = read();
		super.deserialize(context);
	}
}

makeSerializable(
	HarmonyExportSpecifierDependency,
	"webpack/lib/dependencies/HarmonyExportSpecifierDependency"
);

HarmonyExportSpecifierDependency.Template = class HarmonyExportSpecifierDependencyTemplate extends NullDependency.Template {
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
		initFragments.push(
			new InitFragment(
				this.getContent(dependency, module, moduleGraph, runtimeRequirements),
				InitFragment.STAGE_HARMONY_EXPORTS,
				1
			)
		);
	}

	getContent(dep, module, moduleGraph, runtimeRequirements) {
		const used = module.getUsedName(moduleGraph, dep.name);
		if (!used) {
			return `/* unused harmony export ${dep.name || "namespace"} */\n`;
		}

		const exportsName = module.exportsArgument;

		runtimeRequirements.add(RuntimeGlobals.exports);
		runtimeRequirements.add(RuntimeGlobals.definePropertyGetter);

		return `/* harmony export (binding) */ ${
			RuntimeGlobals.definePropertyGetter
		}(${exportsName}, ${JSON.stringify(used)}, function() { return ${
			dep.id
		}; });\n`;
	}
};

module.exports = HarmonyExportSpecifierDependency;
