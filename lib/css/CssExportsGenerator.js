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
	 * @param {CssGeneratorExportsConvention} convention the convention of the exports name
	 * @param {CssGeneratorLocalIdentName | undefined} localIdentName css export local ident name
	 */
	constructor(convention, localIdentName) {
		super();
		/** @type {CssGeneratorExportsConvention} */
		this.convention = convention;
		/** @type {CssGeneratorLocalIdentName | undefined} */
		this.localIdentName = localIdentName;
	}

	// TODO add getConcatenationBailoutReason to allow concatenation
	// but how to make it have a module id

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(module, generateContext) {
		const source = new ReplaceSource(new RawSource(""));
		/** @type {InitFragment<TODO>[]} */
		const initFragments = [];
		/** @type {Map<string, string>} */
		const cssExports = new Map();

		generateContext.runtimeRequirements.add(RuntimeGlobals.module);

		let chunkInitFragments;
		const runtimeRequirements = new Set();

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
			cssExports,
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
			for (const [name, v] of cssExports) {
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
			const otherUsed =
				generateContext.moduleGraph
					.getExportsInfo(module)
					.otherExportsInfo.getUsed(generateContext.runtime) !==
				UsageState.Unused;
			if (otherUsed) {
				generateContext.runtimeRequirements.add(
					RuntimeGlobals.makeNamespaceObject
				);
			}
			const newCssExports = [];
			for (let [k, v] of cssExports) {
				for (let name of cssExportConvention(k, this.convention)) {
					newCssExports.push(`\t${JSON.stringify(name)}: ${JSON.stringify(v)}`);
				}
			}
			return new RawSource(
				`${otherUsed ? `${RuntimeGlobals.makeNamespaceObject}(` : ""}${
					module.moduleArgument
				}.exports = {\n${newCssExports.join(",\n")}\n}${otherUsed ? ")" : ""};`
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
