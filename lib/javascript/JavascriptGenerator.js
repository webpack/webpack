/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const { RawSource, ReplaceSource } = require("webpack-sources");
const Generator = require("../Generator");
const InitFragment = require("../InitFragment");
const { JAVASCRIPT_TYPES } = require("../ModuleSourceTypeConstants");

const RuntimeGlobals = require("../RuntimeGlobals");
const HarmonyCompatibilityDependency = require("../dependencies/HarmonyCompatibilityDependency");

/** @import { Source } from "webpack-sources" */
/** @import { DependencyConstructor } from "../Compilation" */
/** @import DependenciesBlock from "../DependenciesBlock" */
/** @import Dependency from "../Dependency" */
/**
 * @import DependencyTemplate, {
 * 	DependencyTemplateContext
 * } from "../DependencyTemplate"
 */
/** @import { GenerateContext } from "../Generator" */
/**
 * @import Module, {
 * 	ConcatenationBailoutReasonContext,
 * 	SourceType,
 * 	SourceTypes
 * } from "../Module"
 */
/** @import { JavascriptModuleBuildInfo } from "./JavascriptModule" */
/** @import NormalModule from "../NormalModule" */

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

// A wrapped CommonJS module keeps real `module`/`exports` objects and top-level
// `this`, so only requirements that need a module object webpack does not
// synthesize here (id, loaded state, cache, decorators) block wrapping.
/** @type {ReadonlySet<string>} */
const WRAPPING_INCOMPATIBLE_RUNTIME_REQUIREMENTS = new Set([
	RuntimeGlobals.moduleId,
	RuntimeGlobals.moduleLoaded,
	RuntimeGlobals.moduleCache,
	RuntimeGlobals.harmonyModuleDecorator,
	RuntimeGlobals.nodeModuleDecorator
]);

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
		const buildMeta = module.buildMeta;
		const buildInfo = /** @type {JavascriptModuleBuildInfo | undefined} */ (
			module.buildInfo
		);
		const presentationalDependencies = module.presentationalDependencies;
		// An ESM is a "namespace" module carrying the interop flag the harmony
		// parser emits; anything else is treated as CommonJS below
		const isESM =
			buildMeta !== undefined &&
			buildMeta.exportsType === "namespace" &&
			presentationalDependencies !== undefined &&
			presentationalDependencies.some(
				(d) => d instanceof HarmonyCompatibilityDependency
			);

		if (!isESM) {
			// CommonJS concatenation is opt-in via optimization.concatenateModules.commonjs
			if (!context.concatenateCommonJsModules) {
				return "Module is not an ECMAScript module";
			}
			// Concatenated CommonJS always runs wrapped, with real `module`/`exports`,
			// so only a foreign exports shape rules the module out (an undefined
			// exports type is a dynamic `module.exports`, which wrapping supports)
			if (buildMeta === undefined) {
				return "Module is neither an ECMAScript module nor a CommonJS";
			}
			// Sloppy-mode modules bail out in ModuleConcatenationPlugin anyway,
			// so skip the dependency scan for them (most of node_modules)
			if (buildInfo === undefined || !buildInfo.strict) {
				return "Module is not in strict mode";
			}
			if (presentationalDependencies !== undefined) {
				for (const dep of presentationalDependencies) {
					const runtimeRequirements =
						/** @type {{ runtimeRequirements?: ReadonlySet<string> | null }} */
						(dep).runtimeRequirements;
					if (!runtimeRequirements) continue;
					for (const requirement of runtimeRequirements) {
						if (WRAPPING_INCOMPATIBLE_RUNTIME_REQUIREMENTS.has(requirement)) {
							return `Module uses ${requirement}`;
						}
					}
				}
			}
		}

		// Some expressions are not compatible with module concatenation
		// because they may produce unexpected results. The plugin bails out
		// if some were detected upfront.
		if (buildInfo !== undefined && buildInfo.moduleConcatenationBailout) {
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
		return new RawSource(Generator.throwBuildErrorCode(error));
	}
}

module.exports = JavascriptGenerator;
