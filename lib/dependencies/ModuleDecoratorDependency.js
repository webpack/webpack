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
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../util/Hash")} Hash */

class ModuleDecoratorDependency extends NullDependency {
	/**
	 * @param {string} decorator the decorator requirement
	 */
	constructor(decorator) {
		super();
		this.decorator = decorator;
	}

	/**
	 * @returns {string} a display name for the type of dependency
	 */
	get type() {
		return "module decorator";
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
		return [[]];
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		super.updateHash(hash, chunkGraph);
		hash.update(this.decorator);
	}

	serialize(context) {
		const { write } = context;
		write(this.decorator);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.decorator = read();
		super.deserialize(context);
	}
}

makeSerializable(
	ModuleDecoratorDependency,
	"webpack/lib/dependencies/ModuleDecoratorDependency"
);

ModuleDecoratorDependency.Template = class ModuleDecoratorDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ module, chunkGraph, initFragments, runtimeRequirements }
	) {
		const dep = /** @type {ModuleDecoratorDependency} */ (dependency);
		runtimeRequirements.add(RuntimeGlobals.moduleLoaded);
		runtimeRequirements.add(RuntimeGlobals.moduleId);
		runtimeRequirements.add(RuntimeGlobals.module);
		runtimeRequirements.add(dep.decorator);
		initFragments.push(
			new InitFragment(
				`/* module decorator */ ${module.moduleArgument} = ${dep.decorator}(${module.moduleArgument});\n`,
				InitFragment.STAGE_PROVIDES,
				0,
				`module decorator ${chunkGraph.getModuleId(module)}`
			)
		);
	}
};

module.exports = ModuleDecoratorDependency;
