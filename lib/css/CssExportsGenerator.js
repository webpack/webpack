/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const { ReplaceSource, RawSource, ConcatSource } = require("webpack-sources");
const { UsageState } = require("../ExportsInfo");
const Generator = require("../Generator");
const { JS_TYPES } = require("../ModuleSourceTypesConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorLocalIdentName} CssGeneratorLocalIdentName */
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

/**
 * @template T
 * @typedef {import("../InitFragment")<T>} InitFragment
 */

class CssExportsGenerator extends Generator {
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
	 * @param {NormalModule} module module for which the bailout reason should be determined
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(module, context) {
		if (!this.esModule) {
			return "Module is not an ECMAScript module";
		}
		// TODO webpack 6: remove /\[moduleid\]/.test
		if (
			/\[id\]/.test(this.localIdentName) ||
			/\[moduleid\]/.test(this.localIdentName)
		) {
			return "The localIdentName includes moduleId ([id] or [moduleid])";
		}
		return undefined;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(module, generateContext) {
		const source = new ReplaceSource(new RawSource(""));
		/** @type {InitFragment<GenerateContext>[]} */
		const initFragments = [];
		/** @type {CssExportsData} */
		const cssExportsData = {
			esModule: this.esModule,
			exports: new Map()
		};

		generateContext.runtimeRequirements.add(RuntimeGlobals.module);

		/** @type {InitFragment<GenerateContext>[] | undefined} */
		let chunkInitFragments;
		const runtimeRequirements = new Set();

		/** @type {DependencyTemplateContext} */
		const templateContext = {
			runtimeTemplate: generateContext.runtimeTemplate,
			dependencyTemplates: generateContext.dependencyTemplates,
			moduleGraph: generateContext.moduleGraph,
			chunkGraph: generateContext.chunkGraph,
			module,
			runtime: generateContext.runtime,
			runtimeRequirements,
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
		 * @param {Dependency} dependency the dependency
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

		if (generateContext.concatenationScope) {
			const source = new ConcatSource();
			const usedIdentifiers = new Set();
			for (const [name, v] of cssExportsData.exports) {
				let identifier = Template.toIdentifier(name);
				const i = 0;
				while (usedIdentifiers.has(identifier)) {
					identifier = Template.toIdentifier(name + i);
				}
				usedIdentifiers.add(identifier);
				generateContext.concatenationScope.registerExport(name, identifier);
				source.add(
					`${
						generateContext.runtimeTemplate.supportsConst() ? "const" : "var"
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

	/**
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		return JS_TYPES;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		return 42;
	}

	/**
	 * @param {Hash} hash hash that will be modified
	 * @param {UpdateHashContext} updateHashContext context for updating hash
	 */
	updateHash(hash, { module }) {
		hash.update(this.esModule.toString());
	}
}

module.exports = CssExportsGenerator;
