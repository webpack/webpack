/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const { ReplaceSource } = require("webpack-sources");
const Generator = require("../Generator");
const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Generator").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../util/Hash")} Hash */

const TYPES = new Set(["css"]);

class CssGenerator extends Generator {
	constructor() {
		super();
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(module, generateContext) {
		const originalSource = /** @type {Source} */ (module.originalSource());
		const source = new ReplaceSource(originalSource);
		/** @type {InitFragment[]} */
		const initFragments = [];
		const cssExports = new Map();

		generateContext.runtimeRequirements.add(RuntimeGlobals.hasCssModules);

		let chunkInitFragments;
		const templateContext = {
			runtimeTemplate: generateContext.runtimeTemplate,
			dependencyTemplates: generateContext.dependencyTemplates,
			moduleGraph: generateContext.moduleGraph,
			chunkGraph: generateContext.chunkGraph,
			module,
			runtime: generateContext.runtime,
			runtimeRequirements: generateContext.runtimeRequirements,
			concatenationScope: generateContext.concatenationScope,
			codeGenerationResults: generateContext.codeGenerationResults,
			initFragments,
			cssExports,
			get chunkInitFragments() {
				if (!chunkInitFragments) {
					const data = generateContext.getData();
					chunkInitFragments = data.get("chunkInitFragments");
					if (!chunkInitFragments) {
						chunkInitFragments = [];
						data.set("chunkInitFragments", chunkInitFragments);
					}
				}

				return chunkInitFragments;
			}
		};

		/**
		 * @param {Dependency} dependency dependency
		 */
		const handleDependency = dependency => {
			const constructor = /** @type {new (...args: any[]) => Dependency} */ (
				dependency.constructor
			);
			const template = generateContext.dependencyTemplates.get(constructor);
			if (!template) {
				throw new Error(
					"No template for dependency: " + dependency.constructor.name
				);
			}

			template.apply(dependency, source, templateContext);
		};
		module.dependencies.forEach(handleDependency);
		if (module.presentationalDependencies !== undefined)
			module.presentationalDependencies.forEach(handleDependency);

		if (cssExports.size > 0) {
			const data = generateContext.getData();
			data.set("css-exports", cssExports);
		}

		return InitFragment.addToSource(source, initFragments, generateContext);
	}

	/**
	 * @param {NormalModule} module fresh module
	 * @returns {Set<string>} available types (do not mutate)
	 */
	getTypes(module) {
		return TYPES;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		const originalSource = module.originalSource();

		if (!originalSource) {
			return 0;
		}

		return originalSource.size();
	}

	/**
	 * @param {Hash} hash hash that will be modified
	 * @param {UpdateHashContext} updateHashContext context for updating hash
	 */
	updateHash(hash, { module }) {}
}

module.exports = CssGenerator;
