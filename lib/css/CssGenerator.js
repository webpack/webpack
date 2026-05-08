/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const {
	ConcatSource,
	OriginalSource,
	RawSource,
	ReplaceSource,
	SourceMapSource
} = require("webpack-sources");
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
const HarmonyImportSideEffectDependency = require("../dependencies/HarmonyImportSideEffectDependency");

const { encodeMappings } = require("../util/createMappings");
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
/** @typedef {import("./CssModule")} CssModule */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("../../declarations/WebpackOptions").CssParserExportType} CssParserExportType */

/** @typedef {{ line: number, column: number }} SourcePosition */
/** @typedef {Map<string, SourcePosition>} ExportLocsMap */

const getPropertyName = memoize(() => require("../util/property"));
const getCssModulesPlugin = memoize(() => require("./CssModulesPlugin"));

/** @typedef {import("webpack-sources").RawSourceMap} RawSourceMap */

/**
 * Build a v3 source map that maps each line in `generatedJs` containing a
 * known CSS-class export entry back to the corresponding selector position
 * in the original CSS. Lines without an associated export are left
 * unmapped — devtools simply shows them as part of the bundled JS.
 * @param {string} generatedJs the generated JS string
 * @param {ExportLocsMap} exportLocs map of export names to CSS source location
 * @param {string} cssContent original CSS source content
 * @param {string} sourceName source identifier to use in the map
 * @returns {RawSourceMap} a v3 RawSourceMap
 */
const buildExportsSourceMap = (
	generatedJs,
	exportLocs,
	cssContent,
	sourceName
) => {
	const lines = generatedJs.split("\n");

	const lineByExport = new Map();
	for (const [exportName] of exportLocs) {
		const needle = `${JSON.stringify(exportName)}:`;
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].includes(needle)) {
				lineByExport.set(exportName, i);
				break;
			}
		}
	}

	/** @type {(import("../util/createMappings").LineMappings)[]} */
	const perLine = lines.map(() => null);
	for (const [exportName, genLine] of lineByExport) {
		const pos = /** @type {SourcePosition} */ (exportLocs.get(exportName));
		// Source-map V3 uses 0-based lines and 0-based columns. webpack's
		// dependency `loc` uses 1-based lines and 0-based columns, so subtract
		// one from the line.
		perLine[genLine] = {
			generatedColumn: 0,
			sourceIndex: 0,
			originalLine: pos.line - 1,
			originalColumn: pos.column
		};
	}

	return {
		version: 3,
		file: "",
		sources: [sourceName],
		sourcesContent: [cssContent],
		names: [],
		mappings: encodeMappings(perLine)
	};
};

class CssGenerator extends Generator {
	/**
	 * Creates an instance of CssGenerator.
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
	 * Returns the reason this module cannot be concatenated, when one exists.
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
	 * Returns the `@charset` that will appear at the start of this module's
	 * default export, walking through text imports when the module has no
	 * local `@charset` of its own.
	 * @param {NormalModule} module the module
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {WeakSet<NormalModule>=} visited cycle guard
	 * @returns {string | undefined} the effective charset
	 */
	_getEffectiveCharset(module, moduleGraph, visited = new WeakSet()) {
		if (!module || visited.has(module)) return undefined;
		const exportType = /** @type {CssModule} */ (module).exportType;
		if (exportType !== "text" && exportType !== "css-style-sheet") {
			return undefined;
		}
		visited.add(module);
		const own =
			module.buildInfo && /** @type {BuildInfo} */ (module.buildInfo).charset;
		if (own !== undefined) return own;
		if (exportType !== "text") return undefined;
		for (const dep of module.dependencies) {
			if (dep instanceof CssImportDependency) {
				const depModule = /** @type {NormalModule} */ (
					moduleGraph.getModule(dep)
				);
				const inherited = this._getEffectiveCharset(
					depModule,
					moduleGraph,
					visited
				);
				if (inherited !== undefined) return inherited;
			}
		}
		return undefined;
	}

	/**
	 * Generate JavaScript code that requires and concatenates all CSS imports
	 * @param {NormalModule} module the module to generate CSS text for
	 * @param {GenerateContext} generateContext the generate context
	 * @param {boolean} getDefaultExport whether to get the default export
	 * @returns {{ expr: string, type: CssParserExportType }[]} JavaScript code that concatenates all imported CSS
	 */
	_generateImportCode(module, generateContext, getDefaultExport = true) {
		const { moduleGraph, concatenationScope } = generateContext;
		/** @type {{ expr: string, type: CssParserExportType }[]} */
		const parts = [];
		const ownEffectiveCharset =
			/** @type {CssModule} */ (module).exportType === "text"
				? this._getEffectiveCharset(module, moduleGraph)
				: undefined;

		// Iterate through module.dependencies to maintain source order
		for (const dep of module.dependencies) {
			if (dep instanceof CssImportDependency) {
				const depModule = /** @type {CssModule} */ (moduleGraph.getModule(dep));
				// When this text module prepends its own @charset, slice off the
				// imported text module's leading `@charset "..";\n` (whose length
				// is known at build time) so the final output has a single
				// @charset directive at byte 0. The dep's effective charset
				// covers the transitive case where the dep itself has no local
				// @charset but inherits one from a text module it imports.
				const depEffectiveCharset =
					ownEffectiveCharset !== undefined &&
					getDefaultExport &&
					depModule.exportType === "text"
						? this._getEffectiveCharset(depModule, moduleGraph)
						: undefined;
				const charsetPrefixLen =
					depEffectiveCharset !== undefined
						? `@charset "${depEffectiveCharset}";\n`.length
						: 0;

				if (
					concatenationScope &&
					concatenationScope.isModuleInScope(depModule)
				) {
					if (getDefaultExport) {
						const baseExpr = concatenationScope.createModuleReference(
							depModule,
							{
								ids: ["default"],
								call: false,
								directImport: false
							}
						);
						parts.push({
							expr:
								charsetPrefixLen > 0
									? `(${baseExpr}).slice(${charsetPrefixLen})`
									: baseExpr,
							type: /** @type {CssParserExportType} */ (depModule.exportType)
						});
					}
				} else {
					const importVar = generateContext.runtimeTemplate.moduleExports({
						module: depModule,
						chunkGraph: generateContext.chunkGraph,
						request: depModule.userRequest,
						weak: false,
						runtimeRequirements: generateContext.runtimeRequirements
					});

					if (getDefaultExport) {
						generateContext.runtimeRequirements.add(
							RuntimeGlobals.compatGetDefaultExport
						);
						const baseExpr = `(${RuntimeGlobals.compatGetDefaultExport}(${importVar})() || "")`;
						parts.push({
							expr:
								charsetPrefixLen > 0
									? `${baseExpr}.slice(${charsetPrefixLen})`
									: baseExpr,
							type: /** @type {CssParserExportType} */ (depModule.exportType)
						});
					} else {
						parts.push({
							expr: importVar,
							type: /** @type {CssParserExportType} */ (depModule.exportType)
						});
					}
				}
			}
		}

		return parts;
	}

	/**
	 * Generate CSS source for the current module
	 * @param {NormalModule} module the module to generate CSS source for
	 * @param {GenerateContext} generateContext the generate context
	 * @returns {Source | null} the CSS source
	 */
	_generateContentSource(module, generateContext) {
		const moduleSourceContent = /** @type {Source} */ (
			this.generate(module, {
				...generateContext,
				type: CSS_TYPE
			})
		);

		if (!moduleSourceContent) {
			return null;
		}

		const compilation = generateContext.runtimeTemplate.compilation;
		// For non-link exportTypes (style, text, css-style-sheet), url() in the CSS
		// is resolved relative to the document URL (for <style> tags and CSSStyleSheet),
		// not relative to any output file. Use empty undoPath so urls are relative to
		// the output root.
		const undoPath = "";

		const CssModulesPlugin = getCssModulesPlugin();
		const hooks = CssModulesPlugin.getCompilationHooks(compilation);
		return CssModulesPlugin.renderModule(
			/** @type {CssModule} */ (module),
			{
				undoPath,
				moduleSourceContent,
				moduleFactoryCache: this._moduleFactoryCache,
				runtimeTemplate: generateContext.runtimeTemplate
			},
			hooks
		);
	}

	/**
	 * Serialize a CSS Source into a JS string literal with an optional
	 * inline `sourceMappingURL` data URI so DevTools can resolve the
	 * original sources at runtime.
	 * @param {Source} cssSource the CSS source
	 * @param {import("../../declarations/WebpackOptions").DevTool | undefined} devtool the devtool option
	 * @returns {Source} a Source representing a JS string literal
	 */
	_cssToJsLiteral(cssSource, devtool) {
		const { source, map } = cssSource.sourceAndMap();
		let content = /** @type {string} */ (source);
		if (map) {
			const inlineMap =
				typeof devtool === "string" && devtool.includes("nosources")
					? { ...map, sourcesContent: undefined }
					: map;
			const base64Map = Buffer.from(JSON.stringify(inlineMap), "utf8").toString(
				"base64"
			);
			const trailingNewline = content.endsWith("\n") ? "" : "\n";
			content += `${trailingNewline}/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64Map}*/`;
		}
		return new RawSource(JSON.stringify(content));
	}

	/**
	 * Processes the provided module.
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
	 * Processes the provided module.
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
	 * Generates generated code for this runtime module.
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(module, generateContext) {
		const exportType = /** @type {CssModule} */ (module).exportType || "link";
		const source =
			generateContext.type === JAVASCRIPT_TYPE && exportType === "link"
				? new ReplaceSource(new RawSource(""))
				: new ReplaceSource(/** @type {Source} */ (module.originalSource()));
		/** @type {InitFragment<GenerateContext>[]} */
		const initFragments = [];
		/** @type {CssData} */
		const cssData = {
			esModule: /** @type {boolean} */ (this._esModule),
			exports: new Map(),
			exportLocs: new Map()
		};

		this.sourceModule(module, initFragments, source, {
			...generateContext,
			cssData
		});

		switch (generateContext.type) {
			case JAVASCRIPT_TYPE: {
				const compilation = generateContext.runtimeTemplate.compilation;
				const devtool = compilation.options.devtool;
				const isCssModule = /** @type {BuildMeta} */ (module.buildMeta)
					.isCssModule;

				const generateContentCode = () => {
					switch (exportType) {
						case "style": {
							const cssSource = this._generateContentSource(
								module,
								generateContext
							);
							if (!cssSource) return "";

							generateContext.runtimeRequirements.add(
								RuntimeGlobals.cssInjectStyle
							);

							if (generateContext.concatenationScope) {
								return new ConcatSource(
									"__webpack_css_styles__.push(",
									this._cssToJsLiteral(cssSource, devtool),
									");"
								);
							}

							const moduleId = generateContext.chunkGraph.getModuleId(module);

							return new ConcatSource(
								`${RuntimeGlobals.cssInjectStyle}(${JSON.stringify(moduleId || "")}, `,
								this._cssToJsLiteral(cssSource, devtool),
								");"
							);
						}

						default:
							return "";
					}
				};
				const generateImportCode = () => {
					switch (exportType) {
						case "style": {
							return this._generateImportCode(module, generateContext, false)
								.map((part) => `${part.expr};`)
								.join("\n");
						}
						default:
							return "";
					}
				};
				const generateExportCode = () => {
					/** @returns {Source} generated CSS text as JS expression */
					const generateCssText = () => {
						const importCode = this._generateImportCode(
							module,
							generateContext
						);
						const cssSource = this._generateContentSource(
							module,
							generateContext
						);

						let jsLiteral = cssSource
							? this._cssToJsLiteral(cssSource, devtool)
							: new RawSource('""');

						if (importCode.length > 0) {
							if (
								exportType === "css-style-sheet" ||
								importCode.some((part) => part.type !== exportType)
							) {
								generateContext.runtimeRequirements.add(
									RuntimeGlobals.cssMergeStyleSheets
								);

								const args = importCode.map((part) => part.expr);

								jsLiteral = new ConcatSource(
									`${RuntimeGlobals.cssMergeStyleSheets}([${args.join(", ")}, `,
									jsLiteral,
									"])"
								);
							} else {
								jsLiteral = new ConcatSource(
									`${generateContext.runtimeTemplate.concatenation(
										...importCode
									)} + `,
									jsLiteral
								);
							}
						}

						const effectiveCharset =
							exportType === "css-style-sheet" || exportType === "text"
								? this._getEffectiveCharset(module, generateContext.moduleGraph)
								: undefined;
						if (effectiveCharset !== undefined) {
							jsLiteral = new ConcatSource(
								`'@charset "${effectiveCharset}";\\n' + `,
								jsLiteral
							);
						}

						return jsLiteral;
					};
					/**
					 * Generates js default export.
					 * @returns {Source | null} the default export
					 */
					const generateJSDefaultExport = () => {
						switch (exportType) {
							case "text": {
								return generateCssText();
							}
							case "css-style-sheet": {
								const constOrVar =
									generateContext.runtimeTemplate.renderConst();
								const cssText = generateCssText();
								const fnPrefix =
									generateContext.runtimeTemplate.supportsArrowFunction()
										? "() => {\n"
										: "function() {\n";
								const body =
									`${constOrVar} sheet = new CSSStyleSheet();\n` +
									"sheet.replaceSync(cssText);\n" +
									"return sheet;\n";
								return new ConcatSource(
									`(${fnPrefix}${constOrVar} cssText = `,
									cssText,
									`;\n${body}})()`
								);
							}
							default:
								return null;
						}
					};

					/** @type {Source | null} */
					const defaultExport = generateJSDefaultExport();

					/** @type {BuildInfo} */
					(module.buildInfo).cssData = cssData;

					// Required for HMR
					if (module.hot) {
						generateContext.runtimeRequirements.add(RuntimeGlobals.module);
					}

					if (!defaultExport && cssData.exports.size === 0 && !isCssModule) {
						return new RawSource("");
					}

					if (generateContext.concatenationScope) {
						const source = new ConcatSource();
						/** @type {Set<string>} */
						const usedIdentifiers = new Set();
						const { RESERVED_IDENTIFIER } = getPropertyName();

						if (defaultExport) {
							const usedName = generateContext.moduleGraph
								.getExportInfo(module, "default")
								.getUsedName("default", generateContext.runtime);
							if (usedName) {
								let identifier = Template.toIdentifier(usedName);
								if (RESERVED_IDENTIFIER.has(identifier)) {
									identifier = `_${identifier}`;
								}
								usedIdentifiers.add(identifier);
								generateContext.concatenationScope.registerExport(
									"default",
									identifier
								);
								source.add(
									`${generateContext.runtimeTemplate.renderConst()} ${identifier} = `
								);
								source.add(defaultExport);
								source.add(";\n");
							}
						}

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
							generateContext.concatenationScope.registerExport(
								name,
								identifier
							);
							source.add(
								`${generateContext.runtimeTemplate.renderConst()} ${identifier} = ${JSON.stringify(v)};\n`
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

					if (!isCssModule && !needNsObj) {
						return new ConcatSource(
							`${module.moduleArgument}.exports = `,
							/** @type {Source} */ (defaultExport)
						);
					}

					const result = new ConcatSource();
					result.add(
						`${needNsObj ? `${RuntimeGlobals.makeNamespaceObject}(` : ""}${
							module.moduleArgument
						}.exports = {\n`
					);

					if (defaultExport) {
						result.add('\t"default": ');
						result.add(defaultExport);
						if (cssData.exports.size > 0) {
							result.add(",\n");
						}
					}

					/** @type {string[]} */
					const exportEntries = [];
					for (const [name, v] of cssData.exports) {
						exportEntries.push(
							`\t${JSON.stringify(name)}: ${JSON.stringify(v)}`
						);
					}
					if (exportEntries.length > 0) {
						result.add(exportEntries.join(",\n"));
					}

					result.add(`\n}${needNsObj ? ")" : ""};`);
					return result;
				};

				const codeParts = this._exportsOnly
					? [generateExportCode()]
					: [generateImportCode(), generateContentCode(), generateExportCode()];

				const source = new ConcatSource();
				for (const part of codeParts) {
					if (part) {
						source.add(part);
						source.add("\n");
					}
				}
				// For link-type modules without any JS emit, skip source wrapping
				if (
					exportType === "link" &&
					!isCssModule &&
					cssData.exports.size === 0
				) {
					return source;
				}

				const generatedJs = /** @type {string} */ (source.source());
				const sourceName = module.readableIdentifier(
					compilation.requestShortener
				);

				// When per-export source positions are available, emit a
				// SourceMapSource mapping each export line back to its CSS
				// selector; otherwise fall back to OriginalSource.
				if (
					/** @type {ExportLocsMap} */
					(cssData.exportLocs).size > 0
				) {
					const cssOriginal = module.originalSource();
					if (cssOriginal) {
						const sourceMap = buildExportsSourceMap(
							generatedJs,
							/** @type {ExportLocsMap} */
							(cssData.exportLocs),
							/** @type {string} */ (cssOriginal.source()),
							sourceName
						);
						return new SourceMapSource(generatedJs, sourceName, sourceMap);
					}
				}
				return new OriginalSource(generatedJs, sourceName);
			}
			case CSS_TYPE: {
				if (!(this._exportsOnly || (exportType && exportType !== "link"))) {
					generateContext.runtimeRequirements.add(RuntimeGlobals.hasCssModules);
				}

				return InitFragment.addToSource(source, initFragments, generateContext);
			}
			default:
				return null;
		}
	}

	/**
	 * Generates fallback output for the provided error condition.
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
	 * Returns the source types available for this module.
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		const exportType = /** @type {CssModule} */ (module).exportType || "link";
		if (exportType === "style") {
			return JAVASCRIPT_TYPES;
		}

		const sourceTypes = new Set();
		const connections = this._moduleGraph.getIncomingConnections(module);

		for (const connection of connections) {
			if (
				exportType === "link" &&
				connection.dependency instanceof CssImportDependency
			) {
				continue;
			}

			// when no hmr required, css module js output contains no sideEffects at all
			// js sideeffect connection doesn't require js type output
			if (connection.dependency instanceof HarmonyImportSideEffectDependency) {
				continue;
			}

			if (!connection.originModule) {
				continue;
			}

			if (connection.originModule.type.split("/")[0] !== CSS_TYPE) {
				sourceTypes.add(JAVASCRIPT_TYPE);
			} else {
				const originModule = /** @type {CssModule} */ connection.originModule;
				const originExportType = /** @type {CssModule} */ (originModule)
					.exportType;
				if (
					/** @type {boolean} */ (
						originExportType && originExportType !== "link"
					)
				) {
					sourceTypes.add(JAVASCRIPT_TYPE);
				}
			}
		}
		if (
			this._exportsOnly ||
			/** @type {boolean} */ (exportType && exportType !== "link")
		) {
			if (sourceTypes.has(JAVASCRIPT_TYPE)) {
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
	 * Returns the estimated size for the requested source type.
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
					if (/** @type {BuildMeta} */ (module.buildMeta).isCssModule) {
						return 42;
					}
					return 0;
				}
				const exports = cssData.exports;
				/** @type {Record<string, string>} */
				const exportsObj = {};
				for (const [key, value] of exports) {
					exportsObj[key] = value;
				}
				const stringifiedExports = JSON.stringify(exportsObj);

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
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash that will be modified
	 * @param {UpdateHashContext} updateHashContext context for updating hash
	 */
	updateHash(hash, { module }) {
		hash.update(/** @type {boolean} */ (this._esModule).toString());
		hash.update(/** @type {boolean} */ (this._exportsOnly).toString());
	}
}

module.exports = CssGenerator;
