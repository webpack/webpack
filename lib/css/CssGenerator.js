/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const { ReplaceSource } = require("webpack-sources");
const Generator = require("../Generator");
const InitFragment = require("../InitFragment");
const { CSS_TYPES } = require("../ModuleSourceTypesConstants");
const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorLocalIdentName} CssGeneratorLocalIdentName */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../DependencyTemplate").CssExportsData} CssExportsData */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Generator").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../util/Hash")} Hash */

class CssGenerator extends Generator {
	/**
	 * @param {CssGeneratorExportsConvention} convention the convention of the exports name
	 * @param {CssGeneratorLocalIdentName} localIdentName css export local ident name
	 * @param {boolean} esModule whether to use ES modules syntax
	 */
	constructor(convention, localIdentName, esModule) {
		super();
		this.convention = convention;
		this.localIdentName = localIdentName;
		/** @type {boolean} */
		this.esModule = esModule;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(module, generateContext) {
		const originalSource = /** @type {Source} */ (module.originalSource());
		const source = new ReplaceSource(originalSource);
		/** @type {InitFragment<GenerateContext>[]} */
		const initFragments = [];
		/** @type {CssExportsData} */
		const cssExportsData = {
			esModule: this.esModule,
			exports: new Map()
		};

		generateContext.runtimeRequirements.add(RuntimeGlobals.hasCssModules);

		/** @type {InitFragment<GenerateContext>[] | undefined} */
		let chunkInitFragments;
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
				/** @type {CodeGenerationResults} */
				(generateContext.codeGenerationResults),
			initFragments,
			cssExportsData,
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

		/**
		 * @param {Dependency} dependency dependency
		 */
		const handleDependency = dependency => {
			const constructor =
				/** @type {new (...args: EXPECTED_ANY[]) => Dependency} */
				(dependency.constructor);
			const template = generateContext.dependencyTemplates.get(constructor);
			if (!template) {
				throw new Error(
					`No template for dependency: ${dependency.constructor.name}`
				);
			}

			template.apply(dependency, source, templateContext);
		};
		for (const dependency of module.dependencies) {
			handleDependency(dependency);
		}
		if (module.presentationalDependencies !== undefined) {
			for (const dependency of module.presentationalDependencies) {
				handleDependency(dependency);
			}
		}

		const data =
			/** @type {NonNullable<GenerateContext["getData"]>} */
			(generateContext.getData)();
		data.set("css-exports", cssExportsData);

		return InitFragment.addToSource(source, initFragments, generateContext);
	}

	/**
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		return CSS_TYPES;
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
	updateHash(hash, { module }) {
		hash.update(this.esModule.toString());
	}
}

module.exports = CssGenerator;
