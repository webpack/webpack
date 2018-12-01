/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./DependencyTemplate")} DependencyTemplate */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./NormalModule")} NormalModule */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */

/**
 * @typedef {Object} GenerateContext
 * @property {DependencyTemplates} dependencyTemplates mapping from dependencies to templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {Set<string>} runtimeRequirements the requirements for runtime
 * @property {string} type which kind of code should be generated
 */

/**
 *
 */
class Generator {
	static byType(map) {
		return new ByTypeGenerator(map);
	}

	/**
	 * @abstract
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(
		module,
		{ dependencyTemplates, runtimeTemplate, moduleGraph, type }
	) {
		throw new Error("Generator.generate: must be overridden");
	}
}

class ByTypeGenerator extends Generator {
	constructor(map) {
		super();
		this.map = map;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(module, generateContext) {
		const type = generateContext.type;
		const generator = this.map[type];
		if (!generator) {
			throw new Error(`Generator.byType: no generator specified for ${type}`);
		}
		return generator.generate(module, generateContext);
	}
}

module.exports = Generator;
