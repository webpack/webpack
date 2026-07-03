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
	CSS_TEXT_TYPE,
	CSS_TEXT_TYPES,
	CSS_TYPE,
	CSS_TYPES,
	JAVASCRIPT_AND_CSS_TEXT_TYPES,
	JAVASCRIPT_AND_CSS_TYPES,
	JAVASCRIPT_TYPE,
	JAVASCRIPT_TYPES,
	NO_TYPES
} = require("../ModuleSourceTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const { getPresentKinds } = require("../TemplatedPathPlugin");
const CssImportDependency = require("../dependencies/CssImportDependency");
const HarmonyImportSideEffectDependency = require("../dependencies/HarmonyImportSideEffectDependency");

const { encodeMappings } = require("../util/createMappings");
const memoize = require("../util/memoize");
const {
	PUBLIC_PATH_FULL_HASH,
	walkFullHashPlaceholders
} = require("../util/publicPathPlaceholder");

// Avoids `type.split("/")[0]` allocation on the `getTypes` hot path.
const CSS_TYPE_PREFIX = `${CSS_TYPE}/`;

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").CssModuleGeneratorOptions} CssModuleGeneratorOptions */
/** @typedef {import("../Compilation").DependencyConstructor} DependencyConstructor */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssData} CssData */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} CssDependencyTemplateContext */
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
/** @typedef {import("./CssModule").CssModuleBuildInfo} CssModuleBuildInfo */
/** @typedef {import("./CssModule").CssModuleBuildMeta} CssModuleBuildMeta */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("../../declarations/WebpackOptions").CssParserExportType} CssParserExportType */

/** @typedef {{ line: number, column: number }} SourcePosition */
/** @typedef {Map<string, SourcePosition>} ExportLocsMap */

const getPropertyName = memoize(() => require("../util/property"));
const getCssModulesPlugin = memoize(() => require("./CssModulesPlugin"));

/** @typedef {import("webpack-sources").RawSourceMap} RawSourceMap */

/**
 * Build a v3 source map mapping CSS-class export lines back to their selector positions.
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

	// O(L) pass: match `\t"<name>": <value>` lines against export names.
	const keyToName = new Map();
	for (const [exportName] of exportLocs) {
		keyToName.set(JSON.stringify(exportName), exportName);
	}
	const lineByExport = new Map();
	for (let i = 0; i < lines.length && lineByExport.size < keyToName.size; i++) {
		const line = lines[i];
		if (line.charCodeAt(0) !== 9 || line.charCodeAt(1) !== 34) continue;
		let j = 2;
		while (j < line.length) {
			const c = line.charCodeAt(j);
			if (c === 92) {
				j += 2;
				continue;
			}
			if (c === 34) break;
			j++;
		}
		if (line.charCodeAt(j + 1) !== 58) continue;
		const name = keyToName.get(line.slice(1, j + 1));
		if (name !== undefined && !lineByExport.has(name)) {
			lineByExport.set(name, i);
		}
	}

	/** @type {(import("../util/createMappings").LineMappings)[]} */
	const perLine = lines.map(() => null);
	for (const [exportName, genLine] of lineByExport) {
		const pos = /** @type {SourcePosition} */ (exportLocs.get(exportName));
		// V3 source maps are 0-based; webpack `loc` lines are 1-based.
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
		/** @type {CssModuleGeneratorOptions} */
		this.options = options;
		/** @type {boolean | undefined} */
		this._exportsOnly = options.exportsOnly;
		/** @type {boolean | undefined} */
		this._esModule = options.esModule;
		/** @type {ModuleGraph} */
		this._moduleGraph = moduleGraph;
		/** @type {WeakMap<Source, ModuleFactoryCacheEntry>} */
		this._moduleFactoryCache = new WeakMap();
		const localIdentName = options.localIdentName;
		// Detect hash placeholders via the canonical template parser so this stays
		// in sync with `interpolate`'s grammar.
		const isFn = typeof localIdentName === "function";
		const kinds =
			typeof localIdentName === "string"
				? getPresentKinds(localIdentName)
				: undefined;
		/** @type {boolean} */
		this._localIdentNeedsHash =
			isFn ||
			(kinds !== undefined && (kinds.has("fullhash") || kinds.has("hash")));
		/** @type {boolean} */
		this._localIdentNeedsContentHash =
			isFn || (kinds !== undefined && kinds.has("contenthash"));
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
	 * Processes the provided module.
	 * @param {Dependency} dependency the dependency to generate
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext & { cssData: CssData, type: string }} templateContext the template context (shared across all dependencies of the module)
	 * @returns {void}
	 */
	sourceDependency(dependency, source, templateContext) {
		const constructor =
			/** @type {DependencyConstructor} */
			(dependency.constructor);
		const template = templateContext.dependencyTemplates.get(constructor);
		if (!template) {
			throw new Error(
				`No template for dependency: ${dependency.constructor.name}`
			);
		}

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
		// Only `dependency` varies across `template.apply` calls, so one context
		// (and one lazy `chunkInitFragments` getter) serves the whole module.
		/** @type {InitFragment<GenerateContext>[] | undefined} */
		let chunkInitFragments;
		/** @type {CssDependencyTemplateContext} */
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

		for (const dependency of module.dependencies) {
			this.sourceDependency(dependency, source, templateContext);
		}

		if (module.presentationalDependencies !== undefined) {
			for (const dependency of module.presentationalDependencies) {
				this.sourceDependency(dependency, source, templateContext);
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
				const isCssModule = /** @type {CssModuleBuildMeta} */ (module.buildMeta)
					.isCssModule;

				const generateContentCode = () => {
					switch (exportType) {
						case "style": {
							const cssSource = this._renderCss(module, generateContext);
							if (!cssSource) return "";

							generateContext.runtimeRequirements.add(
								RuntimeGlobals.cssInjectStyle
							);

							const moduleId = generateContext.chunkGraph.getModuleId(module);

							if (generateContext.concatenationScope) {
								return new ConcatSource(
									`__webpack_css_styles__.push([${JSON.stringify(moduleId)}, `,
									this._cssToJsLiteral(cssSource, devtool, generateContext),
									"]);"
								);
							}

							return new ConcatSource(
								`${RuntimeGlobals.cssInjectStyle}(${JSON.stringify(
									moduleId
								)}, `,
								this._cssToJsLiteral(cssSource, devtool, generateContext),
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
							return this._generateImportExpressions(module, generateContext)
								.map((expr) => `${expr};`)
								.join("\n");
						}
						default:
							return "";
					}
				};
				const generateExportCode = () => {
					/**
					 * Generates js default export.
					 * @returns {Source | null} the default export
					 */
					const generateJSDefaultExport = () => {
						switch (exportType) {
							case "text": {
								return this._generateCssText(module, generateContext, true);
							}
							case "css-style-sheet": {
								const rt = generateContext.runtimeTemplate;
								const fnPrefix = rt.supportsArrowFunction()
									? "() => {\n"
									: "function() {\n";
								const constOrVar = rt.renderConst();
								const fallback =
									"{ cssText: css, replaceSync: function(value) { this.cssText = value; } }";
								if (rt.compilation.compiler.platform.node === true) {
									return new ConcatSource(
										`(${fnPrefix}${constOrVar} css = `,
										this._generateCssText(module, generateContext, true),
										`;\nreturn ${fallback};\n})()`
									);
								}
								if (rt.isUniversalTarget()) {
									return new ConcatSource(
										`(${fnPrefix}${constOrVar} css = `,
										this._generateCssText(module, generateContext, true),
										`;\nif (typeof CSSStyleSheet === 'undefined') return ${fallback};\n${constOrVar} sheet = new CSSStyleSheet();\nsheet.replaceSync(css);\nreturn sheet;\n})()`
									);
								}
								return new ConcatSource(
									`(${fnPrefix}${constOrVar} sheet = new CSSStyleSheet();\nsheet.replaceSync(`,
									this._generateCssText(module, generateContext, true),
									");\nreturn sheet;\n})()"
								);
							}
							default:
								return null;
						}
					};

					/** @type {Source | null} */
					const defaultExport = generateJSDefaultExport();

					/** @type {CssModuleBuildInfo} */
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
						const exportsInfo =
							generateContext.moduleGraph.getExportsInfo(module);

						if (defaultExport) {
							const usedName = /** @type {string | false} */ (
								exportsInfo
									.getExportInfo("default")
									.getUsedName("default", generateContext.runtime)
							);
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
							const usedName = /** @type {string | false} */ (
								exportsInfo
									.getExportInfo(name)
									.getUsedName(name, generateContext.runtime)
							);
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
								`${generateContext.runtimeTemplate.renderConst()} ${identifier} = ${JSON.stringify(
									v
								)};\n`
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
				if (!(this._exportsOnly || exportType !== "link")) {
					generateContext.runtimeRequirements.add(RuntimeGlobals.hasCssModules);
				}

				return InitFragment.addToSource(source, initFragments, generateContext);
			}
			case CSS_TEXT_TYPE:
				return this._generateCssText(module, generateContext, false);
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

		let hasJs = false;
		let hasCssText = false;
		// Uncached per call (#20800) — the common link case stops scanning once
		// js is seen; `hasCssText` only matters for exports-only / non-link.
		const needsCssText = this._exportsOnly || exportType !== "link";
		const connections = this._moduleGraph.getIncomingConnections(module);

		for (const connection of connections) {
			if (hasJs && (hasCssText || !needsCssText)) break;
			if (
				exportType === "link" &&
				connection.dependency instanceof CssImportDependency
			) {
				continue;
			}

			if (connection.dependency instanceof HarmonyImportSideEffectDependency) {
				continue;
			}

			// HTML inline styles consume CSS_TEXT_TYPE directly.
			if (
				connection.dependency &&
				(connection.dependency.category === "html-style" ||
					connection.dependency.category === "html-style-attribute")
			) {
				hasCssText = true;
				continue;
			}

			if (!connection.originModule) {
				continue;
			}

			if (!connection.originModule.type.startsWith(CSS_TYPE_PREFIX)) {
				hasJs = true;
			} else {
				const originModule = /** @type {CssModule} */ connection.originModule;
				const originExportType =
					/** @type {CssModule} */ (originModule).exportType || "link";
				if (originExportType !== "link") {
					hasJs = true;
				}
			}
		}
		if (this._exportsOnly || exportType !== "link") {
			if (hasJs && hasCssText) return JAVASCRIPT_AND_CSS_TEXT_TYPES;
			if (hasJs) return JAVASCRIPT_TYPES;
			if (hasCssText) return CSS_TEXT_TYPES;
			return NO_TYPES;
		}
		if (hasJs) {
			return JAVASCRIPT_AND_CSS_TYPES;
		}
		return CSS_TYPES;
	}

	/**
	 * @returns {boolean} whether getTypes() depends on the module's incoming connections
	 */
	getTypesDependOnIncomingConnections() {
		return true;
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
				const cssData = /** @type {CssModuleBuildInfo} */ (module.buildInfo)
					.cssData;
				if (!cssData) {
					return 42;
				}
				if (cssData.exports.size === 0) {
					if (
						/** @type {CssModuleBuildMeta} */ (module.buildMeta).isCssModule
					) {
						return 42;
					}
					return 0;
				}
				// `JSON.stringify({...exports}).length` computed entry-wise, without
				// materializing the object or the full string.
				let length = 2 + (cssData.exports.size - 1);
				for (const [key, value] of cssData.exports) {
					length +=
						JSON.stringify(key).length + 1 + JSON.stringify(value).length;
				}

				return length + 42;
			}
			case CSS_TEXT_TYPE:
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

	/**
	 * Resolve the effective `@charset` by walking text imports.
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
			module.buildInfo &&
			/** @type {CssModuleBuildInfo} */ (module.buildInfo).charset;
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
	 * Generate JS expressions for `@import` side effects (`style` exportType only).
	 * @param {NormalModule} module the module to generate CSS text for
	 * @param {GenerateContext} generateContext the generate context
	 * @returns {string[]} JS expressions, one per `@import` dependency
	 */
	_generateImportExpressions(module, generateContext) {
		const { moduleGraph, concatenationScope } = generateContext;
		const parts = [];

		for (const dep of module.dependencies) {
			if (!(dep instanceof CssImportDependency)) continue;
			const depModule = /** @type {CssModule} */ (moduleGraph.getModule(dep));
			if (concatenationScope && concatenationScope.isModuleInScope(depModule)) {
				continue;
			}
			parts.push(
				generateContext.runtimeTemplate.moduleExports({
					module: depModule,
					chunkGraph: generateContext.chunkGraph,
					request: depModule.userRequest,
					weak: false,
					runtimeRequirements: generateContext.runtimeRequirements
				})
			);
		}

		return parts;
	}

	/**
	 * Recursively merge `@import`'d CSS into a single Source (text/css-style-sheet only).
	 * @param {NormalModule} module the module to render
	 * @param {GenerateContext} generateContext the generate context
	 * @param {Set<NormalModule>} ancestors modules on the current path (cycle guard)
	 * @returns {Source | null} merged CSS source, or null when the module has no content
	 */
	_renderMergedCss(module, generateContext, ancestors) {
		if (ancestors.has(module)) return null;
		ancestors.add(module);
		try {
			const { moduleGraph } = generateContext;
			/** @type {Source[]} */
			const parts = [];

			for (const dep of module.dependencies) {
				if (!(dep instanceof CssImportDependency)) continue;
				const depModule = /** @type {CssModule} */ (moduleGraph.getModule(dep));
				if (!depModule) continue;
				const depExportType = depModule.exportType;
				if (depExportType !== "text" && depExportType !== "css-style-sheet") {
					continue;
				}
				const depMerged = this._renderMergedCss(
					depModule,
					generateContext,
					ancestors
				);
				if (depMerged) parts.push(depMerged);
			}

			const own = this._renderCss(module, generateContext);
			if (own) parts.push(own);

			if (parts.length === 0) return null;
			if (parts.length === 1) return parts[0];
			return new ConcatSource(...parts);
		} finally {
			ancestors.delete(module);
		}
	}

	/**
	 * Generate CSS source for the current module
	 * @param {NormalModule} module the module to generate CSS source for
	 * @param {GenerateContext} generateContext the generate context
	 * @returns {Source | null} the CSS source
	 */
	_renderCss(module, generateContext) {
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
	 * Convert a CSS Source into a JS string literal, splicing `__webpack_require__.h()` for `[fullhash]` placeholders.
	 * @param {Source} cssSource the CSS source
	 * @param {import("../../declarations/WebpackOptions").DevTool | undefined} devtool the devtool option
	 * @param {GenerateContext} generateContext the generate context
	 * @returns {Source} a Source representing a JS string literal
	 */
	_cssToJsLiteral(cssSource, devtool, generateContext) {
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

		if (!content.includes(PUBLIC_PATH_FULL_HASH)) {
			return new RawSource(JSON.stringify(content));
		}

		const result = new ConcatSource();
		let last = 0;
		walkFullHashPlaceholders(content, (start, end, length) => {
			result.add(JSON.stringify(content.slice(last, start)));
			result.add(
				length === 0
					? ` + ${RuntimeGlobals.getFullHash}() + `
					: ` + ${RuntimeGlobals.getFullHash}().slice(0, ${length}) + `
			);
			last = end;
		});

		result.add(JSON.stringify(content.slice(last)));
		generateContext.runtimeRequirements.add(RuntimeGlobals.getFullHash);
		return result;
	}

	/**
	 * Generate the merged CSS text for a module, optionally wrapped as a
	 * JS string literal for embedding in JavaScript output.
	 * @param {NormalModule} module the module
	 * @param {GenerateContext} generateContext the generate context
	 * @param {boolean} asJsLiteral wrap the result as a JS string literal
	 * @returns {Source} the CSS text source
	 */
	_generateCssText(module, generateContext, asJsLiteral) {
		const cssSource = this._renderMergedCss(module, generateContext, new Set());
		const effectiveCharset = this._getEffectiveCharset(
			module,
			generateContext.moduleGraph
		);

		let result;
		if (effectiveCharset !== undefined) {
			const prefix = `@charset "${effectiveCharset}";\n`;
			result = cssSource
				? new ConcatSource(prefix, cssSource)
				: new RawSource(prefix);
		} else {
			result = cssSource;
		}

		if (asJsLiteral) {
			const devtool =
				generateContext.runtimeTemplate.compilation.options.devtool;
			return result
				? this._cssToJsLiteral(result, devtool, generateContext)
				: new RawSource('""');
		}
		return result || new RawSource("");
	}
}

module.exports = CssGenerator;
