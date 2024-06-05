/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const { ReplaceSource, RawSource, ConcatSource } = require("webpack-sources");
const { UsageState } = require("../ExportsInfo");
const Generator = require("../Generator");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const { cssExportConvention } = require("../util/conventions");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorLocalIdentName} CssGeneratorLocalIdentName */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../DependencyTemplate").CssExportsData} CssExportsData */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Generator").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../util/Hash")} Hash */

/**
 * @template T
 * @typedef {import("../InitFragment")<T>} InitFragment
 */

const TYPES = new Set(["javascript"]);

class CssExportsGenerator extends Generator {
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
	 * @returns {Source} generated code
	 */
	generate(module, generateContext) {
		const source = new ReplaceSource(new RawSource(""));
		/** @type {InitFragment<TODO>[]} */
		const initFragments = [];
		/** @type {CssExportsData} */
		const cssExportsData = {
			esModule: this.esModule,
			exports: new Map()
		};

		generateContext.runtimeRequirements.add(RuntimeGlobals.module);

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
			runtimeRequirements: runtimeRequirements,
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
		 * @param {Dependency} dependency the dependency
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

		if (generateContext.concatenationScope) {
			const source = new ConcatSource();
			const usedIdentifiers = new Set();
			for (const [name, v] of cssExportsData.exports) {
				for (let k of cssExportConvention(name, this.convention)) {
					let identifier = Template.toIdentifier(k);
					let i = 0;
					while (usedIdentifiers.has(identifier)) {
						identifier = Template.toIdentifier(k + i);
					}
					usedIdentifiers.add(identifier);
					generateContext.concatenationScope.registerExport(k, identifier);
					source.add(
						`${
							generateContext.runtimeTemplate.supportsConst() ? "const" : "var"
						} ${identifier} = ${JSON.stringify(v)};\n`
					);
				}
			}
			return source;
		} else {
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
			const newExports = [];
			for (let [k, v] of cssExportsData.exports) {
				for (let name of cssExportConvention(k, this.convention)) {
					newExports.push(`\t${JSON.stringify(name)}: ${JSON.stringify(v)}`);
				}
			}
			return new RawSource(
				`${needNsObj ? `${RuntimeGlobals.makeNamespaceObject}(` : ""}${
					module.moduleArgument
				}.exports = {\n${newExports.join(",\n")}\n}${needNsObj ? ")" : ""};`
			);
		}
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
		return 42;
	}

	/**
	 * @param {Hash} hash hash that will be modified
	 * @param {UpdateHashContext} updateHashContext context for updating hash
	 */
	updateHash(hash, { module }) {}
}

module.exports = CssExportsGenerator;
