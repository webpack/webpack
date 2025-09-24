/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const { ConcatSource, RawSource, ReplaceSource } = require("webpack-sources");
const { UsageState } = require("../ExportsInfo");
const Generator = require("../Generator");
const InitFragment = require("../InitFragment");
const {
	CSS_TYPE,
	CSS_TYPES,
	JS_AND_CSS_EXPORT_TYPES,
	JS_AND_CSS_TYPES,
	JS_TYPE
} = require("../ModuleSourceTypesConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const memoize = require("../util/memoize");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").CssAutoGeneratorOptions} CssAutoGeneratorOptions */
/** @typedef {import("../../declarations/WebpackOptions").CssGlobalGeneratorOptions} CssGlobalGeneratorOptions */
/** @typedef {import("../../declarations/WebpackOptions").CssModuleGeneratorOptions} CssModuleGeneratorOptions */
/** @typedef {import("../Compilation").DependencyConstructor} DependencyConstructor */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssData} CssData */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Generator").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../util/Hash")} Hash */

const getPropertyName = memoize(() => require("../util/propertyName"));

class CssGenerator extends Generator {
	/**
	 * @param {CssAutoGeneratorOptions | CssGlobalGeneratorOptions | CssModuleGeneratorOptions} options options
	 * @param {ModuleGraph} moduleGraph the module graph
	 */
	constructor(options, moduleGraph) {
		super();
		this.convention = options.exportsConvention;
		this.localIdentName = options.localIdentName;
		this.exportsOnly = options.exportsOnly;
		this.esModule = options.esModule;
		this._moduleGraph = moduleGraph;
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
		/** @type {CssData} */
		const cssData = {
			esModule: /** @type {boolean} */ (this.esModule),
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
			cssData,
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
		const handleDependency = (dependency) => {
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
		};

		for (const dependency of module.dependencies) {
			handleDependency(dependency);
		}

		switch (generateContext.type) {
			case "javascript": {
				/** @type {BuildInfo} */
				(module.buildInfo).cssData = cssData;

				generateContext.runtimeRequirements.add(RuntimeGlobals.module);

				if (generateContext.concatenationScope) {
					const source = new ConcatSource();
					const usedIdentifiers = new Set();
					const { RESERVED_IDENTIFIER } = getPropertyName();
					for (const [name, v] of cssData.exports) {
						const usedName = generateContext.moduleGraph
							.getExportInfo(module, name)
							.getUsedName(name, generateContext.runtime);
						if (!usedName) {
							continue;
						}
						let identifier = Template.toIdentifier(usedName);

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
							`${generateContext.runtimeTemplate.renderConst()} ${identifier} = ${JSON.stringify(v)};\n`
						);
					}
					return source;
				}

				if (
					cssData.exports.size === 0 &&
					!(/** @type {BuildMeta} */ (module.buildMeta).isCSSModule)
				) {
					return new RawSource("");
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

				for (const [name, v] of cssData.exports) {
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

				return InitFragment.addToSource(source, initFragments, generateContext);
			}
			default:
				return null;
		}
	}

	/**
	 * @param {Error} error the error
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generateError(error, module, generateContext) {
		switch (generateContext.type) {
			case "javascript": {
				return new RawSource(
					`throw new Error(${JSON.stringify(error.message)});`
				);
			}
			case "css": {
				return new RawSource(`/**\n ${error.message} \n**/`);
			}
			default:
				return null;
		}
	}

	/**
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		// TODO, find a better way to prevent the original module from being removed after concatenation, maybe it is a bug
		if (this.exportsOnly) {
			return JS_AND_CSS_EXPORT_TYPES;
		}
		const sourceTypes = new Set();
		const connections = this._moduleGraph.getIncomingConnections(module);
		for (const connection of connections) {
			if (!connection.originModule) {
				continue;
			}
			if (connection.originModule.type.split("/")[0] !== CSS_TYPE) {
				sourceTypes.add(JS_TYPE);
			}
		}
		if (sourceTypes.has(JS_TYPE)) {
			return JS_AND_CSS_TYPES;
		}
		return CSS_TYPES;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		switch (type) {
			case "javascript": {
				const cssData = /** @type {BuildInfo} */ (module.buildInfo).cssData;
				if (!cssData) {
					return 42;
				}
				if (cssData.exports.size === 0) {
					if (/** @type {BuildMeta} */ (module.buildMeta).isCSSModule) {
						return 42;
					}
					return 0;
				}
				const exports = cssData.exports;
				const stringifiedExports = JSON.stringify(
					[...exports].reduce((obj, [key, value]) => {
						obj[key] = value;
						return obj;
					}, /** @type {Record<string, string>} */ ({}))
				);

				return stringifiedExports.length + 42;
			}
			case "css": {
				const originalSource = module.originalSource();

				if (!originalSource) {
					return 0;
				}

				return originalSource.size();
			}
			default:
				return 0;
		}
	}

	/**
	 * @param {Hash} hash hash that will be modified
	 * @param {UpdateHashContext} updateHashContext context for updating hash
	 */
	updateHash(hash, { module }) {
		hash.update(/** @type {boolean} */ (this.esModule).toString());
	}
}

module.exports = CssGenerator;
