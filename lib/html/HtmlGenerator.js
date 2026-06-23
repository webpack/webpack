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
const Template = require("../Template");
const { PUBLIC_PATH_AUTO } = require("../util/publicPathPlaceholder");

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
/** @typedef {import("../Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
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

// Hoisted so `resolveChunkUrlSentinels` (per chunk × module) doesn't allocate a
// fresh `RegExp` each call. `String#replace` resets `lastIndex`, so sharing the
// global-flag instance is safe under these synchronous, non-reentrant calls.
const CHUNK_URL_SENTINEL_REGEXP =
	/__WEBPACK_HTML_CHUNK_URL__([0-9a-f]+)__([a-z]+)__END__/g;

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
			CHUNK_URL_SENTINEL_REGEXP,
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
				return `${PUBLIC_PATH_AUTO}${filename}`;
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
		/** @type {HtmlGeneratorOptions} */
		this.options = options || {};
		/** @type {ModuleGraph | undefined} */
		this._moduleGraph = moduleGraph;
		// Raw dependency-template render (before `[webpack/auto]` resolution),
		// shared between the JS and HTML type passes of a single
		// `codeGeneration()` call. Keyed by that call's `runtimeRequirements`
		// Set — created once per call and passed to every type's `generate()`,
		// so it uniquely scopes the cache to one module's one code generation
		// and releases with it. The two passes differ only in `undoPath`.
		/** @type {WeakMap<RuntimeRequirements, string>} */
		this._rawRenderCache = new WeakMap();
	}

	/**
	 * Returns the reason this module cannot be concatenated, when one exists.
	 * @param {NormalModule} module module for which the bailout reason should be determined
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(module, context) {
		// The HMR shim references the per-module `module.hot` object — when an
		// HTML module is concatenated, that scope is gone (the merged file
		// shares a single `module`), so the self-accept / DOM-patch wiring
		// would target the wrong module id. Bail out of concatenation so the
		// HMR-aware HTML module keeps its own module scope.
		if (module.hot) {
			return "HTML module needs its own module scope for HMR";
		}
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
	 * `options.extract === true` always extracts; `false` and `"inline"` never;
	 * when the option is left unspecified, extraction defaults to on for HTML
	 * modules used as compilation entries — that's the HTML-as-entry-point case.
	 * @param {NormalModule} module module
	 * @returns {boolean} true when the `.html` file should be emitted
	 */
	_shouldExtract(module) {
		const { extract } = this.options;
		if (extract === true) return true;
		if (extract === false || extract === "inline") return false;
		return this._isEntryModule(module);
	}

	/**
	 * Whether this module exposes the `html` source type. Like `_shouldExtract`,
	 * but `"inline"` also exposes it — the processed HTML is read back into the
	 * host attribute (e.g. `<iframe srcdoc>`) instead of emitted as a file.
	 * @param {NormalModule} module module
	 * @returns {boolean} true when the `html` source type is available
	 */
	_shouldExposeHtmlType(module) {
		if (this.options.extract === "inline") return true;
		return this._shouldExtract(module);
	}

	/**
	 * Returns the source types available for this module.
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		if (this._shouldExposeHtmlType(module)) {
			return JAVASCRIPT_AND_HTML_TYPES;
		}
		return JAVASCRIPT_TYPES;
	}

	/**
	 * @returns {boolean} whether getTypes() depends on the module's incoming connections
	 */
	getTypesDependOnIncomingConnections() {
		// A fixed extract (`true` / `false` / `"inline"`) gives a stable type set;
		// only the unset default reads `_isEntryModule` (incoming connections).
		const { extract } = this.options;
		return extract !== true && extract !== false && extract !== "inline";
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
		// The dependency-template pass is identical for both type passes (no
		// template branches on `type` or writes `runtimeRequirements`), so
		// compute the raw render once per `codeGeneration()` and reuse it; the
		// passes diverge only in the `[webpack/auto]` substitution below.
		const cacheKey = generateContext.runtimeRequirements;
		let rawContent = this._rawRenderCache.get(cacheKey);
		if (rawContent === undefined) {
			const originalSource = /** @type {Source} */ (module.originalSource());
			const source = new ReplaceSource(originalSource);
			/** @type {InitFragment<GenerateContext>[]} */
			const initFragments = [];

			this.sourceModule(module, initFragments, source, generateContext);
			rawContent = /** @type {string} */ (source.source());
			this._rawRenderCache.set(cacheKey, rawContent);
		}

		if (undoPath === undefined) {
			// HTML output — leave sentinels and `[webpack/auto]` for renderManifest.
			return rawContent;
		}

		// JS-export path — resolve `[webpack/auto]` inline; chunk-URL sentinels
		// stay for `HtmlModulesPlugin`'s `JavascriptModulesPlugin.render` tap.
		return rawContent.split(PUBLIC_PATH_AUTO).join(undoPath);
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
		// `module.hot` is set by `HotModuleReplacementPlugin` on every module
		// when HMR is enabled. When set, we cannot use the concatenation path
		// (it merges into a parent's module scope, where `module.hot.accept`
		// would target the wrong id) — `getConcatenationBailoutReason` keeps
		// us out of concatenation in that case.
		if (generateContext.concatenationScope && !module.hot) {
			generateContext.concatenationScope.registerNamespaceExport(
				ConcatenationScope.NAMESPACE_OBJECT_EXPORT
			);
			sourceContent = `${generateContext.runtimeTemplate.renderConst()} ${
				ConcatenationScope.NAMESPACE_OBJECT_EXPORT
			} = ${JSON.stringify(generated)};`;
		} else {
			generateContext.runtimeRequirements.add(RuntimeGlobals.module);
			if (module.hot) {
				sourceContent = this._renderHmrShim(
					module,
					generated,
					this._shouldExtract(module),
					generateContext.runtimeTemplate
				);
			} else {
				sourceContent = `${module.moduleArgument}.exports = ${JSON.stringify(
					generated
				)};`;
			}
		}

		return new RawSource(sourceContent);
	}

	/**
	 * Emits the JS shim with HMR self-acceptance. When `extracting` is true the
	 * HTML module is also the document the browser is viewing, so the shim
	 * additionally patches `document.body` and `document.title` on every hot
	 * update so the rendered page reflects the new HTML without a full
	 * reload. The patching guard `module.hot.data` ensures the body is only
	 * replaced on a re-evaluation after a hot update — never on the initial
	 * page load, where `document.body` already matches the extracted HTML.
	 *
	 * The runtime extracts the body / title / head-sans-title sections from
	 * the HTML with regexes. HTML comments are *masked* first — their
	 * characters replaced with spaces, preserving length — via a `<!--…-->`
	 * regex, so a `<body>` (or `</body>` / `<title>` / etc.) that appears
	 * inside a comment can't fool the tag regexes — that was the one
	 * well-known sharp edge of HTML+regex. Because masking keeps offsets
	 * stable, the body / title content is sliced back out of the *original*
	 * HTML, so real comments inside `<body>` survive into the patched DOM
	 * exactly as a full page reload would render them.
	 *
	 * `<head>` changes beyond `<title>` (a new `<meta>`, a swapped
	 * `<link rel=icon>`, an inline `<style>` block, …) can't be safely
	 * DOM-patched: webpack injects its own runtime scripts and stylesheet
	 * links into the head on initial load, and blindly replacing
	 * `document.head.innerHTML` would tear them down. So the shim falls
	 * back to a full reload — fine in a dev-server context because the
	 * regular (non-hot-update) `page.html` chunk is re-emitted on every
	 * rebuild, so the reloaded page picks up the new head.
	 * @param {NormalModule} module module
	 * @param {string} html the rewritten HTML content (with placeholders resolved)
	 * @param {boolean} extracting whether the HTML module is being extracted as a real `.html` file
	 * @param {RuntimeTemplate} runtimeTemplate runtime template (drives `const`/arrow emission based on environment support)
	 * @returns {string} JS shim source
	 */
	_renderHmrShim(module, html, extracting, runtimeTemplate) {
		const declare = runtimeTemplate.renderConst();
		const acceptBlock = extracting
			? [
					"module.hot.accept();",
					// Mask `<!-- … -->` comments — replace their characters
					// with spaces, preserving length — before any tag regex
					// runs. Masking (rather than deleting) keeps string offsets
					// stable, so the body/title content can be sliced back out
					// of the original HTML with comments intact, while a
					// `<body>`/`</body>`/`<title>` inside a comment can no
					// longer fool the tag regexes (the non-greedy `*?` would
					// otherwise stop at the FIRST `</body>` it sees, even one
					// inside a comment).
					`${declare} __webpack_mask_comments__ = ${runtimeTemplate.returningFunction(
						`h.replace(/<!--[\\s\\S]*?-->/g, ${runtimeTemplate.returningFunction(
							'c.replace(/[^\\n]/g, " ")',
							"c"
						)})`,
						"h"
					)};`,
					// Mask comments once per evaluation; reused for every
					// tag-boundary search (head/body/title and the dispose-time
					// head diff) so a large page isn't re-scanned per section.
					`${declare} __webpack_masked_html__ = __webpack_mask_comments__(__webpack_html__);`,
					// Slice the inner content of `<tag>…</tag>` out of the original
					// HTML, using the pre-masked copy to locate the tag boundaries.
					`${declare} __webpack_extract__ = ${runtimeTemplate.basicFunction(
						"tag",
						[
							`${declare} open = new RegExp("<" + tag + "[^>]*>", "i").exec(__webpack_masked_html__);`,
							"if (!open) return null;",
							`${declare} start = open.index + open[0].length;`,
							`${declare} close = new RegExp("</" + tag + ">", "i").exec(__webpack_masked_html__.slice(start));`,
							"if (!close) return null;",
							"return __webpack_html__.slice(start, start + close.index);"
						]
					)};`,
					`${declare} __webpack_extract_head__ = ${runtimeTemplate.basicFunction(
						"",
						[
							// Mask only the small extracted head so a comment-only head
							// edit doesn't force a full reload.
							`${declare} head = __webpack_extract__("head");`,
							'return head === null ? "" : __webpack_mask_comments__(head).replace(/<title[^>]*>[\\s\\S]*?<\\/title>/i, "").trim();'
						]
					)};`,
					"if (module.hot.data && typeof document !== 'undefined') {",
					Template.indent([
						`${declare} __webpack_new_head__ = __webpack_extract_head__();`,
						"if (module.hot.data.__webpack_head__ !== undefined && __webpack_new_head__ !== module.hot.data.__webpack_head__ && typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {",
						Template.indent("window.location.reload();"),
						"} else {",
						Template.indent([
							`${declare} __webpack_body__ = __webpack_extract__("body");`,
							"if (__webpack_body__ !== null && document.body) document.body.innerHTML = __webpack_body__;",
							`${declare} __webpack_title__ = __webpack_extract__("title");`,
							"if (__webpack_title__ !== null) document.title = __webpack_title__;"
						]),
						"}"
					]),
					"}",
					// Capture this evaluation's head (sans title, comments
					// masked) on dispose so the next module instance can diff
					// against it.
					`module.hot.dispose(${runtimeTemplate.basicFunction(
						"data",
						"data.__webpack_head__ = __webpack_extract_head__();"
					)});`
				]
			: ["module.hot.accept();"];
		return Template.asString([
			`${declare} __webpack_html__ = ${JSON.stringify(html)};`,
			`${module.moduleArgument}.exports = __webpack_html__;`,
			"if (module.hot) {",
			Template.indent(acceptBlock),
			"}"
		]);
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
		// Source-type set changes when html-type exposure flips; the HMR shim's
		// `extracting` branch changes when the emit decision flips. They differ
		// only for `"inline"` (exposes html, but does not emit), so hash both.
		if (this._shouldExposeHtmlType(updateHashContext.module)) {
			hash.update("html-type");
		}
		if (this._shouldExtract(updateHashContext.module)) {
			hash.update("extract");
		}
		// The HMR shim emits additional self-accept / DOM-patch code that
		// isn't emitted in non-HMR builds, so the cached codegen must
		// invalidate when `module.hot` toggles.
		if (updateHashContext.module.hot) {
			hash.update("hot");
		}
	}
}

module.exports = HtmlGenerator;
