/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const { ReplaceSource, RawSource, ConcatSource } = require("webpack-sources");
const { UsageState } = require("../ExportsInfo");
const Generator = require("../Generator");
const InitFragment = require("../InitFragment");
const { JS_TYPES, JS_AND_CSS_TYPES } = require("../ModuleSourceTypesConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").CssAutoGeneratorOptions} CssAutoGeneratorOptions */
/** @typedef {import("../../declarations/WebpackOptions").CssGlobalGeneratorOptions} CssGlobalGeneratorOptions */
/** @typedef {import("../../declarations/WebpackOptions").CssModuleGeneratorOptions} CssModuleGeneratorOptions */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../DependencyTemplate").CssExportsData} CssExportsData */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Generator").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../util/Hash")} Hash */

class CssGenerator extends Generator {
	/**
	 * @param {CssAutoGeneratorOptions | CssGlobalGeneratorOptions | CssModuleGeneratorOptions} options options
	 */
	constructor(options) {
		super();
		this.convention = options.exportsConvention;
		this.localIdentName = options.localIdentName;
		this.exportsOnly = options.exportsOnly;
		this.esModule = options.esModule;
	}

	/**
	 * @param {NormalModule} module module for which the bailout reason should be determined
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(module, context) {
		if (!this.esModule) {
			return "Module is not an ECMAScript module";
		}

		return undefined;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(module, generateContext) {
		const source =
			generateContext.type === "javascript"
				? new ReplaceSource(new RawSource(""))
				: new ReplaceSource(/** @type {Source} */ (module.originalSource()));

		/** @type {InitFragment<GenerateContext>[]} */
		const initFragments = [];
		/** @type {CssExportsData} */
		const cssExportsData = {
			esModule: this.esModule,
			exports: new Map()
		};

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

		switch (generateContext.type) {
			case "javascript": {
				generateContext.runtimeRequirements.add(RuntimeGlobals.module);

				if (generateContext.concatenationScope) {
					const source = new ConcatSource();
					const usedIdentifiers = new Set();
					for (const [name, v] of cssExportsData.exports) {
						let identifier = Template.toIdentifier(name);
						const { RESERVED_IDENTIFIER } = require("../util/propertyName");
						if (RESERVED_IDENTIFIER.has(identifier)) {
							identifier = `_${identifier}`;
						}
						const i = 0;
						while (usedIdentifiers.has(identifier)) {
							identifier = Template.toIdentifier(name + i);
						}
						usedIdentifiers.add(identifier);
						generateContext.concatenationScope.registerExport(name, identifier);
						source.add(
							`${
								generateContext.runtimeTemplate.supportsConst()
									? "const"
									: "var"
							} ${identifier} = ${JSON.stringify(v)};\n`
						);
					}
					return source;
				}

				const needNsObj =
					this.esModule &&
					generateContext.moduleGraph
						.getExportsInfo(module)
						.otherExportsInfo.getUsed(generateContext.runtime) !==
						UsageState.Unused;

				if (needNsObj) {
					generateContext.runtimeRequirements.add(
						RuntimeGlobals.makeNamespaceObject
					);
				}

				const exports = [];

				for (const [name, v] of cssExportsData.exports) {
					exports.push(`\t${JSON.stringify(name)}: ${JSON.stringify(v)}`);
				}

				return new RawSource(
					`${needNsObj ? `${RuntimeGlobals.makeNamespaceObject}(` : ""}${
						module.moduleArgument
					}.exports = {\n${exports.join(",\n")}\n}${needNsObj ? ")" : ""};`
				);
			}
			case "css": {
				if (module.presentationalDependencies !== undefined) {
					for (const dependency of module.presentationalDependencies) {
						handleDependency(dependency);
					}
				}

				generateContext.runtimeRequirements.add(RuntimeGlobals.hasCssModules);

				const data =
					/** @type {NonNullable<GenerateContext["getData"]>} */
					(generateContext.getData)();
				data.set("css-exports", cssExportsData);

				return InitFragment.addToSource(source, initFragments, generateContext);
			}
		}
	}

	/**
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		return this.exportsOnly ? JS_TYPES : JS_AND_CSS_TYPES;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		switch (type) {
			case "javascript": {
				return 42;
			}
			case "css": {
				const originalSource = module.originalSource();

				if (!originalSource) {
					return 0;
				}

				return originalSource.size();
			}
		}
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
