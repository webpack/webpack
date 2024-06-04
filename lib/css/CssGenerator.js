/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const { ReplaceSource } = require("webpack-sources");
const Generator = require("../Generator");
const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");
const { cssExportConvention } = require("../util/conventions");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorLocalIdentName} CssGeneratorLocalIdentName */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../DependencyTemplate").CssExportsData} CssExportsData */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Generator").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../util/Hash")} Hash */

const TYPES = new Set(["css"]);

class CssGenerator extends Generator {
	/**
	 * @param {CssGeneratorExportsConvention | undefined} convention the convention of the exports name
	 * @param {CssGeneratorLocalIdentName | undefined} localIdentName css export local ident name
	 * @param {boolean} esModule whether to use ES modules syntax
	 */
	constructor(convention, localIdentName, esModule) {
		super();
		/** @type {CssGeneratorExportsConvention | undefined} */
		this.convention = convention;
		/** @type {CssGeneratorLocalIdentName | undefined} */
		this.localIdentName = localIdentName;
		/** @type {boolean} */
		this.esModule = esModule;
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
		/** @type {CssExportsData} */
		const cssExportsData = {
			esModule: this.esModule,
			exports: new Map()
		};

		generateContext.runtimeRequirements.add(RuntimeGlobals.hasCssModules);

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
			codeGenerationResults: generateContext.codeGenerationResults,
			initFragments,
			cssExportsData,
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

		if (cssExportsData.exports.size > 0) {
			const newExports = new Map();
			for (let [name, v] of cssExportsData.exports) {
				for (let newName of cssExportConvention(name, this.convention)) {
					newExports.set(newName, v);
				}
			}
			cssExportsData.exports = newExports;
		}
		const data = generateContext.getData();
		data.set("css-exports", cssExportsData);

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
