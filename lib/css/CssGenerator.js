/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const { ReplaceSource, RawSource } = require("webpack-sources");
const CssModule = require("../CssModule");
const Generator = require("../Generator");
const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");

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
const JAVASCRIPT_TYPES = new Set(["javascript"]);

const CC_REVERSE_SOLIDUS = "\\".charCodeAt(0);
const CC_BACKTICK = "`".charCodeAt(0);
const CC_DOLLAR = "$".charCodeAt(0);

/**
 * @param {string} str original string
 * @returns {string} The input string converted to a template literal, with special characters escaped.
 */
function convertToTemplateLiteral(str) {
	let escapedString = "";

	for (let i = 0; i < str.length; i++) {
		const code = str[i].charCodeAt(0);
		escapedString +=
			code === CC_REVERSE_SOLIDUS || code === CC_BACKTICK || code === CC_DOLLAR
				? `\\${str[i]}`
				: str[i];
	}

	return `\`${escapedString}\``;
}

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

		const data = generateContext.getData();
		data.set("css-exports", cssExportsData);

		const generationResult = InitFragment.addToSource(
			source,
			initFragments,
			generateContext
		);
		if (
			module instanceof CssModule &&
			generateContext.type === "javascript" &&
			module.assertions &&
			module.assertions.type === "css"
		) {
			const isSupportTemplateLiteral =
				generateContext.runtimeTemplate.outputOptions.environment
					.templateLiteral;
			const code = isSupportTemplateLiteral
				? convertToTemplateLiteral(generationResult.source().toString())
				: JSON.stringify(generationResult.source().toString());
			generateContext.runtimeRequirements.add(RuntimeGlobals.module);
			return new RawSource(`const __WEBPACK_CSS_STYLE_SHEET__ =  new CSSStyleSheet();
__WEBPACK_CSS_STYLE_SHEET__.replaceSync(${code});${RuntimeGlobals.module}.exports = __WEBPACK_CSS_STYLE_SHEET__;`);
		}
		return generationResult;
	}

	/**
	 * @param {NormalModule} module fresh module
	 * @returns {Set<string>} available types (do not mutate)
	 */
	getTypes(module) {
		if (
			module instanceof CssModule &&
			module.assertions &&
			module.assertions.type === "css"
		) {
			return JAVASCRIPT_TYPES;
		}
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
	updateHash(hash, { module }) {
		hash.update(this.esModule.toString());
	}
}

module.exports = CssGenerator;
