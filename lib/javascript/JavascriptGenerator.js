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
const CommonJsExportsDependency = require("../dependencies/CommonJsExportsDependency");
const CommonJsFullRequireDependency = require("../dependencies/CommonJsFullRequireDependency");
const CommonJsRequireDependency = require("../dependencies/CommonJsRequireDependency");
const CommonJsSelfReferenceDependency = require("../dependencies/CommonJsSelfReferenceDependency");
const ContextDependency = require("../dependencies/ContextDependency");
const HarmonyCompatibilityDependency = require("../dependencies/HarmonyCompatibilityDependency");
const ImportDependency = require("../dependencies/ImportDependency");
const RequireResolveDependency = require("../dependencies/RequireResolveDependency");
const { propertyAccess } = require("../util/property");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Compilation").DependencyConstructor} DependencyConstructor */
/** @typedef {import("../DependenciesBlock")} DependenciesBlock */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate")} DependencyTemplate */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("../Module").SourceType} SourceType */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("./JavascriptModule").JavascriptModuleBuildInfo} JavascriptModuleBuildInfo */
/** @typedef {import("../NormalModule")} NormalModule */

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

// Runtime requirements whose presence on a presentational dependency means the
// code references the module/exports objects, which do not exist for an inner
// concatenated module (e.g. `module.id`, `module.hot`, top-level `this`).
/** @type {ReadonlySet<string>} */
const CONCATENATION_INCOMPATIBLE_RUNTIME_REQUIREMENTS = new Set([
	RuntimeGlobals.module,
	RuntimeGlobals.moduleId,
	RuntimeGlobals.moduleLoaded,
	RuntimeGlobals.moduleCache,
	RuntimeGlobals.exports,
	RuntimeGlobals.thisAsExports,
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
		// Harmony modules and CommonJS modules with statically rewritable
		// exports are valid for optimization
		if (
			!module.buildMeta ||
			module.buildMeta.exportsType !== "namespace" ||
			module.presentationalDependencies === undefined ||
			!module.presentationalDependencies.some(
				(d) => d instanceof HarmonyCompatibilityDependency
			)
		) {
			// CommonJS concatenation is opt-in via optimization.concatenateCommonJsModules
			const reason = context.concatenateCommonJsModules
				? this._getCommonJsConcatenationBailoutReason(module)
				: "Module is not an ECMAScript module";
			if (reason !== undefined) return reason;
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
	 * Returns the reason a CommonJS module cannot be concatenated as an inner
	 * module. Eligible ("nice") CommonJS modules have a static list of exports,
	 * assigned only via plain `exports.x = …` / `module.exports.x = …`, and never
	 * use the `module`/`exports` objects in any other way, so every reference can
	 * be rewritten to a hoisted local variable.
	 * @param {NormalModule} module module for which the bailout reason should be determined
	 * @returns {string | undefined} reason why this module can't be concatenated
	 */
	_getCommonJsConcatenationBailoutReason(module) {
		const buildMeta = module.buildMeta;
		if (
			!buildMeta ||
			(buildMeta.exportsType !== "flagged" &&
				buildMeta.exportsType !== "default")
		) {
			return "Module is not an ECMAScript module";
		}
		// Sloppy-mode modules bail out in ModuleConcatenationPlugin anyway,
		// so skip the dependency scan for them (most of node_modules)
		if (!(/** @type {JavascriptModuleBuildInfo} */ (module.buildInfo).strict)) {
			return "Module is not in strict mode";
		}
		for (const dep of module.dependencies) {
			if (dep instanceof CommonJsExportsDependency) {
				if (dep.base !== "exports" && dep.base !== "module.exports") {
					return `Module uses ${dep.base} to define exports`;
				}
				if (dep.names.length === 0) {
					return "Module exports are used in an unsupported way";
				}
			} else if (dep instanceof CommonJsSelfReferenceDependency) {
				if (dep.base !== "exports" && dep.base !== "module.exports") {
					return `Module references its exports via ${dep.base}`;
				}
				if (dep.names.length === 0) {
					return `Module uses ${dep.base} as a value`;
				}
				// `exports.f()` passes the exports object as `this`
				if (dep.call && dep.names.length === 1) {
					return `Module calls ${dep.base}${propertyAccess(dep.names)} with its exports as call context`;
				}
			} else if (
				!(dep instanceof CommonJsRequireDependency) &&
				!(dep instanceof CommonJsFullRequireDependency) &&
				!(dep instanceof RequireResolveDependency) &&
				!(dep instanceof ContextDependency) &&
				!(dep instanceof ImportDependency)
			) {
				return `Module uses an unsupported dependency (${dep.type})`;
			}
		}
		if (module.presentationalDependencies !== undefined) {
			for (const dep of module.presentationalDependencies) {
				const runtimeRequirements =
					/** @type {{ runtimeRequirements?: ReadonlySet<string> | null }} */
					(dep).runtimeRequirements;
				if (!runtimeRequirements) continue;
				for (const requirement of runtimeRequirements) {
					if (
						CONCATENATION_INCOMPATIBLE_RUNTIME_REQUIREMENTS.has(requirement)
					) {
						return `Module uses ${requirement}`;
					}
				}
			}
		}
		return undefined;
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

module.exports = JavascriptGenerator;
