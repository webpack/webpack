/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../util/createHash").Hash} Hash */

class ModuleDecoratorDependency extends ModuleDependency {
	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		super.updateHash(hash, chunkGraph);
		hash.update("module decorator");
	}
}

makeSerializable(
	ModuleDecoratorDependency,
	"webpack/lib/dependencies/ModuleDecoratorDependency"
);

ModuleDecoratorDependency.Template = class ModuleDecoratorDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{
			runtimeTemplate,
			moduleGraph,
			chunkGraph,
			initFragments,
			runtimeRequirements
		}
	) {
		const dep = /** @type {ModuleDecoratorDependency} */ (dependency);
		const originModule = moduleGraph.getOrigin(dep);
		runtimeRequirements.add(RuntimeGlobals.module);
		initFragments.push(
			new InitFragment(
				`/* module decorator */ ${
					originModule.moduleArgument
				} = ${runtimeTemplate.moduleExports({
					module: moduleGraph.getModule(dep),
					chunkGraph,
					request: dep.request,
					runtimeRequirements
				})}(${originModule.moduleArgument});\n`,
				InitFragment.STAGE_PROVIDES,
				0,
				`module decorator ${chunkGraph.getModuleId(originModule)}`
			)
		);
	}
};

module.exports = ModuleDecoratorDependency;
