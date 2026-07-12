/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import util from "node:util";
import Generator from "../Generator.js";
import InitFragment from "../InitFragment.js";
import { JAVASCRIPT_TYPES } from "../ModuleSourceTypeConstants.js";
import HarmonyCompatibilityDependency from "../dependencies/HarmonyCompatibilityDependency.js";
import { RawSource, ReplaceSource } from "../util/webpack-sources.js";

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Compilation.js").DependencyConstructor} DependencyConstructor */
/** @typedef {import("../DependenciesBlock.js").default} DependenciesBlock */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../DependencyTemplate.js").default} DependencyTemplate */
/** @typedef {import("../DependencyTemplate.js").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Generator.js").GenerateContext} GenerateContext */
/** @typedef {import("../Module.js").default} Module */
/** @typedef {import("../Module.js").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("../Module.js").SourceType} SourceType */
/** @typedef {import("../Module.js").SourceTypes} SourceTypes */
/** @typedef {import("./JavascriptModule.js").JavascriptModuleBuildInfo} JavascriptModuleBuildInfo */
/** @typedef {import("../NormalModule.js").default} NormalModule */

const DEFAULT_SOURCE = {
	source() {
		return new RawSource("throw new Error('No source available');");
	},
	/**
	 * Returns the estimated size for the requested source type.
	 * @returns {number} size of the DEFAULT_SOURCE.source()
	 */
	size() {
		return 39;
	}
};

// TODO: clean up this file
// replace with newer constructs

const deprecatedGetInitFragments = util.deprecate(
	/**
	 * Handles the callback logic for this hook.
	 * @param {DependencyTemplate} template template
	 * @param {Dependency} dependency dependency
	 * @param {DependencyTemplateContext} templateContext template context
	 * @returns {InitFragment<GenerateContext>[]} init fragments
	 */
	(template, dependency, templateContext) =>
		/** @type {DependencyTemplate & { getInitFragments: (dependency: Dependency, dependencyTemplateContext: DependencyTemplateContext) => InitFragment<GenerateContext>[] }} */
		(template).getInitFragments(dependency, templateContext),
	"DependencyTemplate.getInitFragment is deprecated (use apply(dep, source, { initFragments }) instead)",
	"DEP_WEBPACK_JAVASCRIPT_GENERATOR_GET_INIT_FRAGMENTS"
);

class JavascriptGenerator extends Generator {
	/**
	 * Returns the source types available for this module.
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		return JAVASCRIPT_TYPES;
	}

	/**
	 * Returns the estimated size for the requested source type.
	 * @param {NormalModule} module the module
	 * @param {SourceType=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		const originalSource = module.originalSource();
		if (!originalSource) {
			return DEFAULT_SOURCE.size();
		}
		return originalSource.size();
	}

	/**
	 * Returns the reason this module cannot be concatenated, when one exists.
	 * @param {NormalModule} module module for which the bailout reason should be determined
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(module, context) {
		// Only harmony modules are valid for optimization
		if (
			!module.buildMeta ||
			module.buildMeta.exportsType !== "namespace" ||
			module.presentationalDependencies === undefined ||
			!module.presentationalDependencies.some(
				(d) => d instanceof HarmonyCompatibilityDependency
			)
		) {
			return "Module is not an ECMAScript module";
		}

		// Some expressions are not compatible with module concatenation
		// because they may produce unexpected results. The plugin bails out
		// if some were detected upfront.
		const buildInfo = /** @type {JavascriptModuleBuildInfo | undefined} */ (
			module.buildInfo
		);
		if (buildInfo && buildInfo.moduleConcatenationBailout) {
			return `Module uses ${buildInfo.moduleConcatenationBailout}`;
		}
	}

	/**
	 * Processes the provided module.
	 * @param {Dependency} dependency the dependency to generate
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the template context shared for the whole module
	 * @param {GenerateContext} generateContext the render context
	 * @returns {void}
	 */
	sourceDependency(dependency, source, templateContext, generateContext) {
		const constructor =
			/** @type {DependencyConstructor} */
			(dependency.constructor);
		const template = generateContext.dependencyTemplates.get(constructor);
		if (!template) {
			throw new Error(
				`No template for dependency: ${dependency.constructor.name}`
			);
		}

		template.apply(dependency, source, templateContext);

		// TODO remove in webpack 6
		if ("getInitFragments" in template) {
			const fragments = deprecatedGetInitFragments(
				template,
				dependency,
				templateContext
			);

			if (fragments) {
				for (const fragment of fragments) {
					templateContext.initFragments.push(fragment);
				}
			}
		}
	}

	/**
	 * Processes the provided module.
	 * @param {Module} module the module to generate
	 * @param {DependenciesBlock} block the dependencies block which will be processed
	 * @param {DependencyTemplateContext} templateContext the template context shared for the whole module
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {GenerateContext} generateContext the generateContext
	 * @returns {void}
	 */
	sourceBlock(module, block, templateContext, source, generateContext) {
		for (const dependency of block.dependencies) {
			this.sourceDependency(
				dependency,
				source,
				templateContext,
				generateContext
			);
		}

		for (const childBlock of block.blocks) {
			this.sourceBlock(
				module,
				childBlock,
				templateContext,
				source,
				generateContext
			);
		}
	}

	/**
	 * Processes the provided module.
	 * @param {Module} module the module to generate
	 * @param {InitFragment<GenerateContext>[]} initFragments mutable list of init fragments
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {GenerateContext} generateContext the generateContext
	 * @returns {void}
	 */
	sourceModule(module, initFragments, source, generateContext) {
		/** @type {InitFragment<GenerateContext>[] | undefined} */
		let chunkInitFragments;

		// one template context for all dependencies of the module (hot path)
		/** @type {DependencyTemplateContext} */
		const templateContext = {
			runtimeTemplate: generateContext.runtimeTemplate,
			dependencyTemplates: generateContext.dependencyTemplates,
			moduleGraph: generateContext.moduleGraph,
			chunkGraph: generateContext.chunkGraph,
			module,
			runtime: generateContext.runtime,
			runtimeRequirements: generateContext.runtimeRequirements,
			concatenationScope: generateContext.concatenationScope,
			codeGenerationResults:
				/** @type {NonNullable<GenerateContext["codeGenerationResults"]>} */
				(generateContext.codeGenerationResults),
			initFragments,
			get chunkInitFragments() {
				if (!chunkInitFragments) {
					const data =
						/** @type {NonNullable<GenerateContext["getData"]>} */
						(generateContext.getData)();
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
			this.sourceDependency(
				dependency,
				source,
				templateContext,
				generateContext
			);
		}

		if (module.presentationalDependencies !== undefined) {
			for (const dependency of module.presentationalDependencies) {
				this.sourceDependency(
					dependency,
					source,
					templateContext,
					generateContext
				);
			}
		}

		for (const childBlock of module.blocks) {
			this.sourceBlock(
				module,
				childBlock,
				templateContext,
				source,
				generateContext
			);
		}
	}

	/**
	 * Generates generated code for this runtime module.
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(module, generateContext) {
		const originalSource = module.originalSource();
		if (!originalSource) {
			return DEFAULT_SOURCE.source();
		}

		const source = new ReplaceSource(originalSource);
		/** @type {InitFragment<GenerateContext>[]} */
		const initFragments = [];

		this.sourceModule(module, initFragments, source, generateContext);

		return InitFragment.addToSource(source, initFragments, generateContext);
	}

	/**
	 * Generates fallback output for the provided error condition.
	 * @param {Error} error the error
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generateError(error, module, generateContext) {
		return new RawSource(`throw new Error(${JSON.stringify(error.message)});`);
	}
}

export default JavascriptGenerator;

export { JavascriptGenerator as "module.exports" };
