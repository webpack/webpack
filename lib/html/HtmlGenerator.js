/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ReplaceSource } = require("webpack-sources");
const Generator = require("../Generator");
const { HTML_TYPE } = require("../ModuleSourceTypeConstants");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../Module").SourceType} SourceType */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("../Compilation").DependencyConstructor} DependencyConstructor */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../InitFragment")<GenerateContext>} InitFragment */

class HtmlGenerator extends Generator {
	/**
	 * @param {object | undefined} options options
	 */
	constructor(options) {
		super();
		this.options = options;
	}

	/**
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		return new Set([HTML_TYPE]);
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {SourceType=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		const originalSource = module.originalSource();
		return originalSource ? originalSource.size() : 0;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(module, generateContext) {
		const {
			type,
			dependencyTemplates,
			runtimeTemplate,
			moduleGraph,
			chunkGraph,
			runtimeRequirements,
			runtime,
			codeGenerationResults,
			concatenationScope,
			getData
		} = generateContext;
		if (type !== HTML_TYPE) {
			throw new Error(`Unsupported module type: ${type}`);
		}

		const originalSource = module.originalSource();
		if (!originalSource) return null;

		const source = new ReplaceSource(originalSource);
		/** @type {InitFragment[]} */
		const initFragments = [];

		/** @type {InitFragment[] | undefined} */
		let chunkInitFragments;

		/** @type {DependencyTemplateContext} */
		const templateContext = {
			runtimeTemplate,
			dependencyTemplates,
			moduleGraph,
			chunkGraph,
			module,
			runtime,
			runtimeRequirements,
			concatenationScope,
			codeGenerationResults: /** @type {import("../CodeGenerationResults")} */ (
				codeGenerationResults
			),
			initFragments,
			get chunkInitFragments() {
				if (!chunkInitFragments) {
					const data = /** @type {NonNullable<GenerateContext["getData"]>} */ (
						getData
					)();
					chunkInitFragments = data.get("chunkInitFragments");
					if (!chunkInitFragments) {
						chunkInitFragments = [];
						data.set("chunkInitFragments", chunkInitFragments);
					}
				}
				return chunkInitFragments;
			}
		};

		for (const dependency of module.dependencies) {
			const constructor = /** @type {DependencyConstructor} */ (
				dependency.constructor
			);
			const template = dependencyTemplates.get(constructor);
			if (template) {
				template.apply(dependency, source, templateContext);
			}
		}

		if (module.presentationalDependencies !== undefined) {
			for (const dependency of module.presentationalDependencies) {
				const constructor = /** @type {DependencyConstructor} */ (
					dependency.constructor
				);
				const template = dependencyTemplates.get(constructor);
				if (template) {
					template.apply(dependency, source, templateContext);
				}
			}
		}

		return source;
	}
}

module.exports = HtmlGenerator;
