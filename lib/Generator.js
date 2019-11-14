/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AbstractMethodError = require("./AbstractMethodError");

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
	 * @returns {Set<string>} available types (do not mutate)
	 */
	getTypes() {
		throw new AbstractMethodError();
	}

	/**
	 * @abstract
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		throw new AbstractMethodError();
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
		throw new AbstractMethodError();
	}
}

class ByTypeGenerator extends Generator {
	constructor(map) {
		super();
		this.map = map;
		this._types = new Set(Object.keys(map));
	}

	/**
	 * @returns {Set<string>} available types (do not mutate)
	 */
	getTypes() {
		return this._types;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		const t = type || "javascript";
		const generator = this.map[t];
		return generator ? generator.getSize(module, t) : 0;
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
