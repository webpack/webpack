/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { RawSource, ReplaceSource } = require("webpack-sources");
const ConcatenationScope = require("../ConcatenationScope");
const Generator = require("../Generator");
const {
	HTML_TYPE,
	JAVASCRIPT_TYPE,
	JAVASCRIPT_TYPES
} = require("../ModuleSourceTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const CssUrlDependency = require("../dependencies/CssUrlDependency");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").HtmlGeneratorOptions} HtmlGeneratorOptions */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compilation").DependencyConstructor} DependencyConstructor */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Generator").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Module").SourceType} SourceType */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("../Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../util/Hash")} Hash */
/**
 * @template T
 * @typedef {import("../InitFragment")<T>} InitFragment
 */

/**
 * @type {ReadonlySet<"javascript" | "html">}
 */
const JAVASCRIPT_AND_HTML_TYPES = new Set([JAVASCRIPT_TYPE, HTML_TYPE]);

/** @type {WeakMap<Compilation, Map<string, Chunk>>} */
const chunksByIdCache = new WeakMap();

class HtmlGenerator extends Generator {
	/**
	 * Emit a sentinel for a chunk URL that can't be resolved at code-gen time
	 * (chunk hashes aren't computed yet); `resolveChunkUrlSentinels` swaps it
	 * for `${PUBLIC_PATH_AUTO}<chunkFilename>` once they are.
	 * @param {Chunk} chunk chunk
	 * @param {"javascript" | "css"} contentHashType which chunk content hash slot the resolved URL should reference
	 * @returns {string} sentinel
	 */
	static makeChunkUrlSentinel(chunk, contentHashType) {
		const hexId = Buffer.from(String(chunk.id), "utf8").toString("hex");
		return `__WEBPACK_HTML_CHUNK_URL__${hexId}__${contentHashType}__END__`;
	}

	/**
	 * Replace every `makeChunkUrlSentinel` sentinel in `content` with
	 * `${PUBLIC_PATH_AUTO}<chunkFilename>`. Must run after
	 * `Compilation#createHash()` so `[contenthash]` resolves.
	 * @param {string} content content
	 * @param {Compilation} compilation compilation
	 * @returns {string} resolved content
	 */
	static resolveChunkUrlSentinels(content, compilation) {
		if (!content.includes("__WEBPACK_HTML_CHUNK_URL__")) return content;
		const outputOptions = compilation.outputOptions;
		let chunksById = chunksByIdCache.get(compilation);
		if (chunksById === undefined) {
			chunksById = new Map();
			for (const chunk of compilation.chunks) {
				chunksById.set(String(chunk.id), chunk);
			}
			chunksByIdCache.set(compilation, chunksById);
		}
		return content.replace(
			/__WEBPACK_HTML_CHUNK_URL__([0-9a-f]+)__([a-z]+)__END__/g,
			(_, hexId, contentHashType) => {
				const chunkId = Buffer.from(hexId, "hex").toString("utf8");
				const chunk = chunksById.get(chunkId);
				if (!chunk) return "data:,";
				let filenameTemplate;
				if (contentHashType === "css") {
					const CssModulesPlugin = require("../css/CssModulesPlugin");

					filenameTemplate = CssModulesPlugin.getChunkFilenameTemplate(
						chunk,
						outputOptions
					);
				} else {
					filenameTemplate =
						chunk.filenameTemplate ||
						(chunk.canBeInitial()
							? outputOptions.filename
							: outputOptions.chunkFilename);
				}
				const filename = compilation.getPath(
					/** @type {import("../TemplatedPathPlugin").TemplatePath} */
					(filenameTemplate),
					{
						chunk,
						contentHashType
					}
				);
				return `${CssUrlDependency.PUBLIC_PATH_AUTO}${filename}`;
			}
		);
	}

	/**
	 * Creates an instance of HtmlGenerator.
	 * @param {HtmlGeneratorOptions=} options generator options
	 * @param {ModuleGraph=} moduleGraph the module graph; used to detect when an HTML module is reached as a compilation entry so `extract` can default to `true` for it
	 */
	constructor(options, moduleGraph) {
		super();
		this.options = options || {};
		/** @type {ModuleGraph | undefined} */
		this._moduleGraph = moduleGraph;
	}

	/**
	 * Returns the reason this module cannot be concatenated, when one exists.
	 * @param {NormalModule} module module for which the bailout reason should be determined
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(module, context) {
		return undefined;
	}

	/**
	 * Whether this HTML module is reached as a compilation entry. Entry
	 * modules have at least one incoming connection without an
	 * `originModule` (the EntryDependency added by `compilation.addEntry`).
	 * @param {NormalModule} module module
	 * @returns {boolean} true when the module is an entry
	 */
	_isEntryModule(module) {
		if (!this._moduleGraph) return false;
		for (const connection of this._moduleGraph.getIncomingConnections(module)) {
			if (!connection.originModule) return true;
		}
		return false;
	}

	/**
	 * Whether to emit the extracted `.html` file for this module.
	 * `options.extract === true` always extracts; `false` never; when the
	 * option is left unspecified, extraction defaults to on for HTML modules
	 * used as compilation entries — that's the HTML-as-entry-point use case.
	 * @param {NormalModule} module module
	 * @returns {boolean} true when the `.html` file should be emitted
	 */
	_shouldExtract(module) {
		const { extract } = this.options;
		if (extract === true) return true;
		if (extract === false) return false;
		return this._isEntryModule(module);
	}

	/**
	 * Returns the source types available for this module.
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		if (this._shouldExtract(module)) {
			return JAVASCRIPT_AND_HTML_TYPES;
		}
		return JAVASCRIPT_TYPES;
	}

	/**
	 * Returns the estimated size for the requested source type.
	 * @param {NormalModule} module the module
	 * @param {SourceType=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		const originalSource = module.originalSource();
		if (!originalSource) return 0;
		if (type === HTML_TYPE) return originalSource.size();
		return originalSource.size() + 10;
	}

	/**
	 * Processes the provided module.
	 * @param {NormalModule} module the current module
	 * @param {Dependency} dependency the dependency to generate
	 * @param {InitFragment<GenerateContext>[]} initFragments mutable list of init fragments
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {GenerateContext} generateContext the render context
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
	 * Processes the provided dependencies block.
	 * @param {NormalModule} module the module to generate
	 * @param {import("../DependenciesBlock")} block the dependencies block which will be processed
	 * @param {InitFragment<GenerateContext>[]} initFragments mutable list of init fragments
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {GenerateContext} generateContext the generateContext
	 * @returns {void}
	 */
	sourceBlock(module, block, initFragments, source, generateContext) {
		for (const dependency of block.dependencies) {
			this.sourceDependency(
				module,
				dependency,
				initFragments,
				source,
				generateContext
			);
		}

		for (const childBlock of block.blocks) {
			this.sourceBlock(
				module,
				childBlock,
				initFragments,
				source,
				generateContext
			);
		}
	}

	/**
	 * Processes the provided module.
	 * @param {NormalModule} module the module to generate
	 * @param {InitFragment<GenerateContext>[]} initFragments mutable list of init fragments
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {GenerateContext} generateContext the generateContext
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

		for (const childBlock of module.blocks) {
			this.sourceBlock(
				module,
				childBlock,
				initFragments,
				source,
				generateContext
			);
		}
	}

	/**
	 * Run all HTML dependency templates against the original module source and
	 * return the rewritten HTML. When `undoPath` is a string, `[webpack/auto]`
	 * placeholders left in by asset/url dependencies are resolved to that
	 * undo path (use `""` to make URLs root-relative). When `undoPath` is
	 * `undefined`, the placeholders are preserved so the caller (typically
	 * `HtmlModulesPlugin#renderManifest`, which only knows the final
	 * `.html` filename after code generation) can resolve them itself.
	 * @param {NormalModule} module the module to render
	 * @param {GenerateContext} generateContext the generate context
	 * @param {string=} undoPath value to substitute for `[webpack/auto]` placeholders
	 * @returns {string} the rewritten HTML
	 */
	_renderHtml(module, generateContext, undoPath) {
		const originalSource = /** @type {Source} */ (module.originalSource());
		const source = new ReplaceSource(originalSource);
		/** @type {InitFragment<GenerateContext>[]} */
		const initFragments = [];

		this.sourceModule(module, initFragments, source, generateContext);

		if (undoPath === undefined) {
			// HTML output — leave sentinels and `[webpack/auto]` for renderManifest.
			return /** @type {string} */ (source.source());
		}

		// JS-export path — resolve `[webpack/auto]` inline; chunk-URL sentinels
		// stay for `HtmlModulesPlugin`'s `JavascriptModulesPlugin.render` tap.
		let content = /** @type {string} */ (source.source());
		content = content.split(CssUrlDependency.PUBLIC_PATH_AUTO).join(undoPath);
		return content;
	}

	/**
	 * Generates generated code for this runtime module.
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(module, generateContext) {
		const originalSource = module.originalSource();

		if (!originalSource) {
			return new RawSource("");
		}

		if (generateContext.type === HTML_TYPE) {
			// Preserve `[webpack/auto]`; renderManifest resolves it once `.html` filename is known.
			return new RawSource(
				this._renderHtml(module, generateContext, undefined)
			);
		}

		// JS export: resolve `[webpack/auto]` to root-relative URLs.
		const generated = this._renderHtml(module, generateContext, "");

		/** @type {string} */
		let sourceContent;
		if (generateContext.concatenationScope) {
			generateContext.concatenationScope.registerNamespaceExport(
				ConcatenationScope.NAMESPACE_OBJECT_EXPORT
			);
			sourceContent = `${generateContext.runtimeTemplate.renderConst()} ${
				ConcatenationScope.NAMESPACE_OBJECT_EXPORT
			} = ${JSON.stringify(generated)};`;
		} else {
			generateContext.runtimeRequirements.add(RuntimeGlobals.module);
			sourceContent = `${module.moduleArgument}.exports = ${JSON.stringify(
				generated
			)};`;
		}

		return new RawSource(sourceContent);
	}

	/**
	 * Generates fallback output for the provided error condition.
	 * @param {Error} error the error
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generateError(error, module, generateContext) {
		if (generateContext.type === HTML_TYPE) {
			// Strip `<`, `>`, `--` runs from `error.message` so it can't escape the comment.
			const safe = String(error.message)
				.replace(/[<>]/g, "")
				.replace(/-{2,}/g, (m) => `${"-".repeat(m.length - 1)} `);
			return new RawSource(`<!-- webpack error: ${safe} -->`);
		}
		return new RawSource(`throw new Error(${JSON.stringify(error.message)});`);
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash that will be modified
	 * @param {UpdateHashContext} updateHashContext context for updating hash
	 */
	updateHash(hash, updateHashContext) {
		hash.update("html");
		// Hash effective extraction state — source-type set changes when this flips.
		if (this._shouldExtract(updateHashContext.module)) {
			hash.update("extract");
		}
	}
}

module.exports = HtmlGenerator;
