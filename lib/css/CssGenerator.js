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
	JAVASCRIPT_AND_CSS_TYPES,
	JAVASCRIPT_TYPE,
	JAVASCRIPT_TYPES
} = require("../ModuleSourceTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const CssImportDependency = require("../dependencies/CssImportDependency");
const EntryDependency = require("../dependencies/EntryDependency");
const { getUndoPath } = require("../util/identifier");
const memoize = require("../util/memoize");

/** @typedef {import("webpack-sources").Source} Source */
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
/** @typedef {import("../Module").SourceType} SourceType */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("./CssModulesPlugin").ModuleFactoryCacheEntry} ModuleFactoryCacheEntry */
/** @typedef {import("../CssModule")} CssModule */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("../../declarations/WebpackOptions").CssParserExportType} CssParserExportType */

const getPropertyName = memoize(() => require("../util/propertyName"));
const getCssModulesPlugin = memoize(() => require("./CssModulesPlugin"));

class CssGenerator extends Generator {
	/**
	 * @param {CssModuleGeneratorOptions} options options
	 * @param {ModuleGraph} moduleGraph the module graph
	 */
	constructor(options, moduleGraph) {
		super();
		this.options = options;
		this._exportsOnly = options.exportsOnly;
		this._esModule = options.esModule;
		this._moduleGraph = moduleGraph;
		/** @type {WeakMap<Source, ModuleFactoryCacheEntry>} */
		this._moduleFactoryCache = new WeakMap();
	}

	/**
	 * @param {NormalModule} module module for which the bailout reason should be determined
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(module, context) {
		if (!this._esModule) {
			return "Module is not an ECMAScript module";
		}

		return undefined;
	}

	/**
	 * Generate JavaScript code that requires and concatenates all CSS imports
	 * @param {NormalModule} module the module to generate CSS text for
	 * @param {GenerateContext} generateContext the generate context
	 * @returns {{ expr: string, type: CssParserExportType }[]} JavaScript code that concatenates all imported CSS
	 */
	_generateImportCode(module, generateContext) {
		const moduleGraph = generateContext.moduleGraph;
		/** @type {{ expr: string, type: CssParserExportType }[]} */
		const parts = [];

		// Iterate through module.dependencies to maintain source order
		for (const dep of module.dependencies) {
			if (dep instanceof CssImportDependency) {
				/** @type {CssModule} */
				const depModule = /** @type {CssModule} */ (moduleGraph.getModule(dep));
				const importVar = generateContext.runtimeTemplate.moduleExports({
					module: depModule,
					chunkGraph: generateContext.chunkGraph,
					request: /** @type {CssModule} */ (depModule).userRequest,
					weak: false,
					runtimeRequirements: generateContext.runtimeRequirements
				});

				generateContext.runtimeRequirements.add(
					RuntimeGlobals.compatGetDefaultExport
				);
				parts.push({
					expr: `(${RuntimeGlobals.compatGetDefaultExport}(${importVar})() || "")`,
					type: /** @type {CssParserExportType} */ (
						/** @type {BuildMeta} */ (depModule.buildMeta).exportType
					)
				});
			}
		}

		return parts;
	}

	/**
	 * Generate CSS code for the current module
	 * @param {NormalModule} module the module to generate CSS code for
	 * @param {GenerateContext} generateContext the generate context
	 * @returns {string} the CSS code as string
	 */
	_generateModuleCode(module, generateContext) {
		const moduleSourceContent = /** @type {Source} */ (
			this.generate(module, {
				...generateContext,
				type: CSS_TYPE
			})
		);

		if (!moduleSourceContent) {
			return "";
		}

		const compilation = generateContext.runtimeTemplate.compilation;
		const { path: filename } = compilation.getPathWithInfo(
			compilation.outputOptions.cssChunkFilename,
			{
				runtime: generateContext.runtime,
				contentHashType: "css"
			}
		);
		const undoPath = getUndoPath(
			filename,
			compilation.outputOptions.path,
			false
		);

		const CssModulesPlugin = getCssModulesPlugin();
		const hooks = CssModulesPlugin.getCompilationHooks(compilation);
		const renderedSource = CssModulesPlugin.renderModule(
			/** @type {CssModule} */ (module),
			{
				undoPath,
				moduleSourceContent,
				moduleFactoryCache: this._moduleFactoryCache,
				runtimeTemplate: generateContext.runtimeTemplate
			},
			hooks
		);

		if (!renderedSource) {
			return "";
		}

		const content = renderedSource.source();
		return typeof content === "string" ? content : content.toString("utf8");
	}

	/**
	 * @param {NormalModule} module the current module
	 * @param {Dependency} dependency the dependency to generate
	 * @param {InitFragment<GenerateContext>[]} initFragments mutable list of init fragments
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {GenerateContext & { cssData: CssData }} generateContext the render context
	 * @returns {void}
	 */
	sourceDependency(module, dependency, initFragments, source, generateContext) {
		const constructor =
			/** @type {DependencyConstructor} */
			(dependency.constructor);
		const template = generateContext.dependencyTemplates.get(constructor);
		if (!template) {
			throw new Error(
				`No template for dependency: ${dependency.constructor.name}`
			);
		}

		/** @type {DependencyTemplateContext} */
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
			cssData: generateContext.cssData,
			type: generateContext.type,
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

		template.apply(dependency, source, templateContext);
	}

	/**
	 * @param {NormalModule} module the module to generate
	 * @param {InitFragment<GenerateContext>[]} initFragments mutable list of init fragments
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {GenerateContext & { cssData: CssData }} generateContext the generateContext
	 * @returns {void}
	 */
	sourceModule(module, initFragments, source, generateContext) {
		for (const dependency of module.dependencies) {
			this.sourceDependency(
				module,
				dependency,
				initFragments,
				source,
				generateContext
			);
		}

		if (module.presentationalDependencies !== undefined) {
			for (const dependency of module.presentationalDependencies) {
				this.sourceDependency(
					module,
					dependency,
					initFragments,
					source,
					generateContext
				);
			}
		}
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(module, generateContext) {
		const exportType = /** @type {BuildMeta} */ (module.buildMeta).exportType;
		const source =
			generateContext.type === JAVASCRIPT_TYPE
				? exportType === "link"
					? new ReplaceSource(new RawSource(""))
					: new ReplaceSource(/** @type {Source} */ (module.originalSource()))
				: new ReplaceSource(/** @type {Source} */ (module.originalSource()));
		/** @type {InitFragment<GenerateContext>[]} */
		const initFragments = [];
		/** @type {CssData} */
		const cssData = {
			esModule: /** @type {boolean} */ (this._esModule),
			exports: new Map()
		};

		this.sourceModule(module, initFragments, source, {
			...generateContext,
			cssData
		});

		const generateCssText = () => {
			const importCode = this._generateImportCode(module, generateContext);
			const moduleCode = this._generateModuleCode(module, generateContext);

			if (importCode.length > 0) {
				if (
					exportType === "css-style-sheet" ||
					importCode.some((part) => part.type !== exportType)
				) {
					generateContext.runtimeRequirements.add(
						RuntimeGlobals.cssMergeStyleSheets
					);

					return `${RuntimeGlobals.cssMergeStyleSheets}([${[...importCode.map((part) => part.expr), JSON.stringify(moduleCode)].join(", ")}])`;
				}
				return generateContext.runtimeTemplate.concatenation(
					...importCode,
					moduleCode
				);
			}
			return JSON.stringify(moduleCode);
		};

		/**
		 * @returns {string | null} the default export
		 */
		const generateJSDefaultExport = () => {
			switch (exportType) {
				case "text": {
					return generateCssText();
				}
				case "css-style-sheet": {
					const constOrVar = generateContext.runtimeTemplate.renderConst();
					return `(${generateContext.runtimeTemplate.basicFunction("", [
						`${constOrVar} cssText = ${generateCssText()};`,
						`${constOrVar} sheet = new CSSStyleSheet();`,
						"sheet.replaceSync(cssText);",
						"return sheet;"
					])})()`;
				}
				default:
					return null;
			}
		};

		switch (generateContext.type) {
			case JAVASCRIPT_TYPE: {
				const isCSSModule = /** @type {BuildMeta} */ (module.buildMeta)
					.isCSSModule;
				const defaultExport = generateJSDefaultExport();
				/**
				 * @param {string} name the export name
				 * @param {string} value the export value
				 * @returns {string} the value to be used in the export
				 */
				const stringifyExportValue = (name, value) => {
					if (defaultExport) {
						return name === "default" ? value : JSON.stringify(value);
					}
					return JSON.stringify(value);
				};

				/** @type {BuildInfo} */
				(module.buildInfo).cssData = cssData;

				// Required for HMR
				if (module.hot) {
					generateContext.runtimeRequirements.add(RuntimeGlobals.module);
				}

				if (defaultExport) {
					cssData.exports.set("default", /** @type {string} */ (defaultExport));
				}

				if (cssData.exports.size === 0 && !isCSSModule) {
					return new RawSource("");
				}

				if (generateContext.concatenationScope) {
					const source = new ConcatSource();
					/** @type {Set<string>} */
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
						let i = 0;
						while (usedIdentifiers.has(identifier)) {
							identifier = Template.toIdentifier(name + i);
							i += 1;
						}
						usedIdentifiers.add(identifier);
						generateContext.concatenationScope.registerExport(name, identifier);
						source.add(
							`${generateContext.runtimeTemplate.renderConst()} ${identifier} = ${stringifyExportValue(name, v)};\n`
						);
					}
					return source;
				}

				const needNsObj =
					this._esModule &&
					generateContext.moduleGraph
						.getExportsInfo(module)
						.otherExportsInfo.getUsed(generateContext.runtime) !==
						UsageState.Unused;

				if (needNsObj) {
					generateContext.runtimeRequirements.add(
						RuntimeGlobals.makeNamespaceObject
					);
				}

				// Should be after `concatenationScope` to allow module inlining
				generateContext.runtimeRequirements.add(RuntimeGlobals.module);

				if (!isCSSModule && !needNsObj) {
					return new RawSource(
						`${module.moduleArgument}.exports = ${defaultExport}`
					);
				}

				/** @type {string[]} */
				const exports = [];

				for (const [name, v] of cssData.exports) {
					exports.push(
						`\t${JSON.stringify(name)}: ${stringifyExportValue(name, v)}`
					);
				}

				return new RawSource(
					`${needNsObj ? `${RuntimeGlobals.makeNamespaceObject}(` : ""}${
						module.moduleArgument
					}.exports = {\n${exports.join(",\n")}\n}${needNsObj ? ")" : ""};`
				);
			}
			case CSS_TYPE: {
				if (!this._generatesJsOnly(module)) {
					generateContext.runtimeRequirements.add(RuntimeGlobals.hasCssModules);
				}

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
			case JAVASCRIPT_TYPE: {
				return new RawSource(
					`throw new Error(${JSON.stringify(error.message)});`
				);
			}
			case CSS_TYPE: {
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
		const exportType = /** @type {BuildMeta} */ (module.buildMeta).exportType;
		const sourceTypes = new Set();
		const connections = this._moduleGraph.getIncomingConnections(module);

		let isEntryModule = false;
		for (const connection of connections) {
			if (connection.dependency instanceof EntryDependency) {
				isEntryModule = true;
			}
			if (
				exportType === "link" &&
				connection.dependency instanceof CssImportDependency
			) {
				continue;
			}
			if (!connection.originModule) {
				continue;
			}
			if (connection.originModule.type.split("/")[0] !== CSS_TYPE) {
				sourceTypes.add(JAVASCRIPT_TYPE);
			} else {
				const originModule = /** @type {CssModule} */ connection.originModule;
				const originExportType = /** @type {BuildMeta} */ (
					originModule.buildMeta
				).exportType;
				if (
					/** @type {boolean} */ (
						originExportType && originExportType !== "link"
					)
				) {
					sourceTypes.add(JAVASCRIPT_TYPE);
				}
			}
		}
		if (this._generatesJsOnly(module)) {
			if (sourceTypes.has(JAVASCRIPT_TYPE) || isEntryModule) {
				return JAVASCRIPT_TYPES;
			}
			return new Set();
		}
		if (sourceTypes.has(JAVASCRIPT_TYPE)) {
			return JAVASCRIPT_AND_CSS_TYPES;
		}
		return CSS_TYPES;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {SourceType=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		switch (type) {
			case JAVASCRIPT_TYPE: {
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
			case CSS_TYPE: {
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
		hash.update(/** @type {boolean} */ (this._esModule).toString());
	}

	/**
	 * @param {NormalModule} module module
	 * @returns {boolean} true if the module only outputs JavaScript
	 */
	_generatesJsOnly(module) {
		const exportType = /** @type {BuildMeta} */ (module.buildMeta).exportType;
		return (
			this._exportsOnly ||
			/** @type {boolean} */ (exportType && exportType !== "link")
		);
	}
}

module.exports = CssGenerator;
