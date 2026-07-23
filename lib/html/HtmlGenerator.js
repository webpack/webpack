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
const WebpackError = require("../errors/WebpackError");
const { getUndoPath } = require("../util/identifier");
const memoize = require("../util/memoize");
const { PUBLIC_PATH_AUTO } = require("../util/publicPathPlaceholder");
const { NodeType, SourceProcessor, escapeAttribute } = require("./syntax");

// Lazy so loading the HTML generator doesn't pull in the whole CSS pipeline.
const getCssModulesPlugin = memoize(() => require("../css/CssModulesPlugin"));
// The CSS tokenizer, used to locate `url(...)` when rebasing inlined stylesheets.
const getCssSyntax = memoize(() => require("../css/syntax"));
// node's crypto — real SHA hashes for Content-Security-Policy source lists
// (the wasm hashes are xxhash, unusable for CSP), loaded only when CSP is on.
const getCreateNodeHash = memoize(() => require("crypto").createHash);

// HTML void elements — serialized without a closing tag when a tag descriptor
// (`output.html` `injectTags`) doesn't say otherwise.
const VOID_TAGS = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr"
]);

/**
 * Serializes an attribute map: `true` → bare attribute, `false`/`undefined`/
 * `null` → omitted, else a quoted (escaped) value.
 * @param {Record<string, string | boolean | undefined> | undefined} attrs attributes
 * @returns {string} the leading-space-prefixed attribute string
 */
const serializeAttrs = (attrs) => {
	let out = "";
	if (attrs) {
		for (const name of Object.keys(attrs)) {
			const value = attrs[name];
			if (value === false || value === undefined || value === null) continue;
			out +=
				value === true
					? ` ${name}`
					: ` ${name}="${escapeAttribute(`${value}`)}"`;
		}
	}
	return out;
};

/**
 * Serializes one tag descriptor. `attrs` values: `true` → bare attribute,
 * `false`/`undefined` → omitted, else a quoted (escaped) value.
 * @param {HtmlTagDescriptor} tag the descriptor
 * @returns {string} the tag's HTML
 */
const serializeTag = (tag) => {
	const attrs = serializeAttrs(tag.attrs);
	const isVoid =
		tag.voidTag !== undefined
			? tag.voidTag
			: VOID_TAGS.has(tag.tag.toLowerCase());
	return isVoid
		? `<${tag.tag}${attrs}>`
		: `<${tag.tag}${attrs}>${tag.children || ""}</${tag.tag}>`;
};

/**
 * Canonical string of an attribute map (present keys, sorted) — used to detect
 * whether an `transformTags` plugin changed a tag, so unchanged tags stay untouched.
 * `false`/`undefined`/`null` count as absent.
 * @param {Record<string, string | boolean | undefined>} attrs attributes
 * @returns {string} a comparable snapshot
 */
const snapshotAttrs = (attrs) =>
	JSON.stringify(
		Object.keys(attrs)
			.filter((name) => {
				const value = attrs[name];
				return value !== false && value !== undefined && value !== null;
			})
			.sort()
			.map((name) => [name, attrs[name]])
	);

/**
 * Whether an attribute renders (present and not `false`/`undefined`/`null`).
 * @param {Record<string, string | boolean | undefined>} attrs attributes
 * @param {string} name attribute name
 * @returns {boolean} true if it renders
 */
const attrPresent = (attrs, name) => {
	const value = attrs[name];
	return value !== undefined && value !== false && value !== null;
};

/**
 * Whether a `<meta>`'s attributes declare a Content-Security-Policy (case-
 * insensitive `http-equiv`), used to detect an author-declared CSP.
 * @param {Record<string, string | boolean | undefined>} attrs attributes
 * @returns {boolean} true if it is a CSP meta
 */
const metaIsCsp = (attrs) => {
	for (const name of Object.keys(attrs)) {
		const value = attrs[name];
		if (
			name.toLowerCase() === "http-equiv" &&
			typeof value === "string" &&
			value.trim().toLowerCase() === "content-security-policy"
		) {
			return true;
		}
	}
	return false;
};

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").HtmlGeneratorOptions} HtmlGeneratorOptions */
/** @typedef {import("../../declarations/WebpackOptions").OutputHtmlOptions["csp"]} CspOption */
/** @typedef {import("./HtmlModulesPlugin").HtmlTagDescriptor} HtmlTagDescriptor */
/** @typedef {import("./HtmlModulesPlugin").HtmlMutableTag} HtmlMutableTag */
/** @typedef {"head" | "body"} HtmlTagLocation */
/**
 * @typedef {object} HtmlTagSpan
 * @property {number} start opening `<` offset
 * @property {number} openEnd offset just after the opening `>`
 * @property {number} end offset just after the whole element
 * @property {HtmlTagLocation} location the `<head>`/`<body>` region it sits in
 * @property {number} nameEnd offset after the tag name (nonce insertion point), `-1` for non-`<script>`/`<style>`
 * @property {number} contentEnd raw-text body end for `<script>`/`<style>`, `-1` otherwise
 * @property {boolean} selfClosing whether the element is self-closing
 */
/** @typedef {{ headOpen: number, headEnd: number, bodyOpen: number, bodyEnd: number }} HtmlAnchors */
/** @typedef {{ tags: HtmlMutableTag[], spans: (HtmlTagSpan | null)[], originals: (string | null)[], descriptors: (HtmlTagDescriptor | null)[], anchors: HtmlAnchors }} HtmlModel */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {boolean | string[] | ((asset: { chunk: Chunk, filename: string }) => string[] | false)} HtmlIntegrity */
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
/** @typedef {import("./HtmlModule").HtmlModuleBuildInfo} HtmlModuleBuildInfo */
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

/**
 * `String(chunk.id)` → chunk lookup, memoized per compilation and shared by the
 * URL and integrity sentinel resolvers.
 * @param {Compilation} compilation compilation
 * @returns {Map<string, Chunk>} chunks keyed by stringified id
 */
const getChunksById = (compilation) => {
	let chunksById = chunksByIdCache.get(compilation);
	if (chunksById === undefined) {
		chunksById = new Map();
		for (const chunk of compilation.chunks) {
			chunksById.set(String(chunk.id), chunk);
		}
		chunksByIdCache.set(compilation, chunksById);
	}
	return chunksById;
};

// Hoisted so `resolveChunkUrlSentinels` (per chunk × module) doesn't allocate a
// fresh `RegExp` each call. `String#replace` resets `lastIndex`, so sharing the
// global-flag instance is safe under these synchronous, non-reentrant calls.
const CHUNK_URL_SENTINEL_REGEXP =
	/__WEBPACK_HTML_CHUNK_URL__([0-9a-f]+)__([a-z]+)__END__/g;

// Sentinel for a linked HTML page (a tag mapped to the `html` source type);
// resolved to the page's emitted filename once it has been built. Keyed by the
// linked module's id so it shares the `<iframe srcdoc>` nested-module mechanism.
const HTML_PAGE_URL_SENTINEL_REGEXP =
	/__WEBPACK_HTML_PAGE_URL__([0-9a-f]+)__END__/g;

// Sentinel for a URL-referenced asset (font/image/…) emitted into a resource-hint
// `<link>` tag by `HtmlEntryDependency`; resolved to the asset's real emitted
// URL from its codegen data during `HtmlModulesPlugin` render. Deferred because
// HtmlEntry deps run *while* the HTML module is being codegen'd — the asset
// module's own codegen might not have completed yet. Keyed by the asset
// module's identifier, hex-encoded so any character in it is safe in a URL.
const ASSET_URL_SENTINEL_REGEXP =
	/__WEBPACK_HTML_ASSET_URL__([0-9a-f]+)__END__/g;

// Matches the whole ` integrity="<sentinel>"` so the attribute can be dropped
// entirely when the per-asset `integrity` function returns `false`.
const INTEGRITY_SENTINEL_REGEXP =
	/ integrity="__WEBPACK_HTML_INTEGRITY__([0-9a-f]+)__([a-z]+)__END__"/g;

// Same attribute, but tolerant of the `\"` escaping the surrounding quotes get
// when the HTML lives inside a JS string literal — used only to strip it there.
const INTEGRITY_SENTINEL_STRIP_REGEXP =
	/ integrity=\\?"__WEBPACK_HTML_INTEGRITY__[0-9a-f]+__[a-z]+__END__\\?"/g;

// The trailing `(?:__<hash>)?` is the inlined chunk's content hash, embedded by
// `embedInlineChunkHashes` so the host HTML's bytes (and its `[contenthash]`,
// incl. RealContentHashPlugin's recompute) change with the inlined content; the
// resolver ignores it.
const INLINE_SENTINEL_REGEXP =
	/__WEBPACK_HTML_INLINE__([0-9a-f]+)__([a-z]+)(?:__[0-9a-f]+)?__END__/g;

/**
 * Rewrite relative `url(...)` references in a CSS chunk so they still resolve
 * after the styles are inlined into the HTML document (which may sit in a
 * different directory). webpack emits every url as `undoPath(cssFile) + <asset
 * path from the output root>`, so swapping the CSS file's undo prefix for the
 * HTML file's re-bases them — no path math. Uses the CSS tokenizer to find url
 * tokens exactly (never a `url(` inside a comment or string); webpack emits
 * unquoted url()s (special characters `\`-escaped), so only that shape occurs.
 * @param {string} css the CSS content
 * @param {string} fromFile the CSS file's output name
 * @param {string} toFile the HTML file's output name
 * @param {string} outputPath the compilation output path
 * @returns {string} the CSS with rebased urls
 */
const rebaseCssUrls = (css, fromFile, toFile, outputPath) => {
	const fromUndo = getUndoPath(fromFile, outputPath, false);
	const toUndo = getUndoPath(toFile, outputPath, false);
	if (fromUndo === toUndo) return css;
	const { readToken, TT_URL } = getCssSyntax();
	const token = {
		type: 0,
		start: 0,
		end: 0,
		isId: false,
		contentStart: 0,
		contentEnd: 0,
		unitStart: 0
	};
	let pos = 0;
	let last = 0;
	let out = "";
	while (readToken(css, pos, token) !== undefined) {
		pos = token.end;
		if (token.type !== TT_URL) continue;
		const url = css.slice(token.contentStart, token.contentEnd);
		// Rebase only the undo-path-relative urls; a root-relative (`/`), fragment
		// (`#`) or scheme (`data:`, …, a `:` before any `/`) url is absolute.
		const colon = url.indexOf(":");
		const slash = url.indexOf("/");
		if (
			!url.startsWith(fromUndo) ||
			url[0] === "/" ||
			url[0] === "#" ||
			(colon !== -1 && (slash === -1 || colon < slash))
		) {
			continue;
		}
		out += `${css.slice(last, token.contentStart)}${toUndo}${url.slice(
			fromUndo.length
		)}`;
		last = token.contentEnd;
	}
	return last === 0 ? css : out + css.slice(last);
};

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
		const chunksById = getChunksById(compilation);
		return content.replace(
			CHUNK_URL_SENTINEL_REGEXP,
			(_, hexId, contentHashType) => {
				const chunkId = Buffer.from(hexId, "hex").toString("utf8");
				const chunk = chunksById.get(chunkId);
				if (!chunk) return "data:,";
				// Reuse each pipeline's own filename-template resolver so the URL
				// matches exactly what that plugin emits (worker/hot-update chunk
				// handling included), mirroring the CSS branch.
				let filenameTemplate;
				if (contentHashType === "css") {
					filenameTemplate = getCssModulesPlugin().getChunkFilenameTemplate(
						chunk,
						outputOptions
					);
				} else {
					const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");

					filenameTemplate = JavascriptModulesPlugin.getChunkFilenameTemplate(
						chunk,
						outputOptions
					);
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
	 * Emit a sentinel for a linked HTML page's URL (a tag the user mapped to
	 * the `html` source `type`). The page's emitted filename isn't known at
	 * code-gen time; `resolveHtmlPageUrlSentinels` swaps it for
	 * `${PUBLIC_PATH_AUTO}<htmlFilename>` once the page has been built.
	 * @param {string | number} moduleId id of the linked HTML module
	 * @returns {string} sentinel
	 */
	static makeHtmlPageUrlSentinel(moduleId) {
		const hexId = Buffer.from(String(moduleId), "utf8").toString("hex");
		return `__WEBPACK_HTML_PAGE_URL__${hexId}__END__`;
	}

	/**
	 * Replace every `makeHtmlPageUrlSentinel` sentinel in `content` with
	 * `${PUBLIC_PATH_AUTO}<htmlFilename>`, resolving each linked page's emitted
	 * filename through `getFilename`.
	 * @param {string} content content
	 * @param {(moduleId: string) => string} getFilename maps a linked module id to its emitted html filename
	 * @returns {string} resolved content
	 */
	static resolveHtmlPageUrlSentinels(content, getFilename) {
		if (!content.includes("__WEBPACK_HTML_PAGE_URL__")) return content;
		return content.replace(
			HTML_PAGE_URL_SENTINEL_REGEXP,
			(_, hexId) =>
				`${PUBLIC_PATH_AUTO}${getFilename(
					Buffer.from(hexId, "hex").toString("utf8")
				)}`
		);
	}

	/**
	 * Emit a sentinel for a URL-referenced asset module. Resolved by
	 * `resolveAssetUrlSentinels` from the asset module's own codegen data
	 * (`data.get("url")`), which isn't populated when `HtmlEntryDependency`
	 * runs — the asset module's own codegen may still be pending.
	 * @param {string} moduleIdentifier the referenced asset module's `identifier()`
	 * @returns {string} sentinel
	 */
	static makeAssetUrlSentinel(moduleIdentifier) {
		const hex = Buffer.from(moduleIdentifier, "utf8").toString("hex");
		return `__WEBPACK_HTML_ASSET_URL__${hex}__END__`;
	}

	/**
	 * Replace every `makeAssetUrlSentinel` in `content` with the asset module's
	 * emitted URL, read from its codegen data. Unresolved sentinels (module
	 * absent, no codegen result yet, or no URL channel — e.g. an inlined
	 * data-URI) map to `data:,` so the surrounding `<link>` degrades cleanly
	 * instead of shipping the raw placeholder.
	 * @param {string} content content
	 * @param {Compilation} compilation compilation
	 * @returns {string} resolved content
	 */
	static resolveAssetUrlSentinels(content, compilation) {
		if (!content.includes("__WEBPACK_HTML_ASSET_URL__")) return content;
		/** @type {Map<string, import("../Module")>} */
		const byIdentifier = new Map();
		for (const m of compilation.modules) byIdentifier.set(m.identifier(), m);
		const codeGenerationResults =
			/** @type {import("../CodeGenerationResults")} */
			(compilation.codeGenerationResults);
		return content.replace(ASSET_URL_SENTINEL_REGEXP, (_, hex) => {
			const id = Buffer.from(hex, "hex").toString("utf8");
			const module = byIdentifier.get(id);
			if (!module) return "data:,";
			if (!codeGenerationResults.has(module, undefined)) return "data:,";
			const codeGen = codeGenerationResults.get(module, undefined);
			const data = codeGen.data;
			if (!data) return "data:,";
			const url =
				/** @type {Record<string, string | undefined> | undefined} */
				(data.get("url"));
			// Prefer the `asset-url` channel — it's the actual URL string
			// (publicPath + filename). Also handled: assets reached only from JS
			// have no `asset-url` channel (their only URL is the JS expression
			// `__webpack_require__.p + "…"`); for those we reconstruct the URL
			// from the emitted `filename` + `PUBLIC_PATH_AUTO` so the same
			// undo-path substitution runs at asset render.
			if (url && url["asset-url"]) return url["asset-url"];
			const filename = /** @type {string | undefined} */ (data.get("filename"));
			if (filename) return `${PUBLIC_PATH_AUTO}${filename}`;
			return "data:,";
		});
	}

	/**
	 * Emit a sentinel for a chunk's SRI hash. Resolved late (after
	 * `RealContentHashPlugin`) by `resolveChunkIntegritySentinels`, since the
	 * hash must cover the chunk's final emitted bytes.
	 * @param {Chunk} chunk chunk
	 * @param {"javascript" | "css"} contentHashType which chunk asset to hash
	 * @returns {string} sentinel
	 */
	static makeChunkIntegritySentinel(chunk, contentHashType) {
		const hexId = Buffer.from(String(chunk.id), "utf8").toString("hex");
		return `__WEBPACK_HTML_INTEGRITY__${hexId}__${contentHashType}__END__`;
	}

	/**
	 * Drop every ` integrity="<sentinel>"` from `content`. Used on the HTML
	 * string embedded in a JS chunk (e.g. `<iframe srcdoc>`), where a real SRI
	 * hash can't be produced — the chunk's own bytes aren't final at render time
	 * — and resolving it later would mutate the chunk after its content hash was
	 * computed. Only real HTML output assets keep the sentinel for late resolution.
	 * @param {string} content content
	 * @returns {string} content with integrity sentinels removed
	 */
	static stripChunkIntegritySentinels(content) {
		if (!content.includes("__WEBPACK_HTML_INTEGRITY__")) return content;
		return content.replace(INTEGRITY_SENTINEL_STRIP_REGEXP, "");
	}

	/**
	 * Replace every ` integrity="<sentinel>"` with the chunk's real SRI hashes,
	 * or drop the attribute when `integrity` (a function) returns `false` for it.
	 * @param {string} content content
	 * @param {Compilation} compilation compilation
	 * @param {HtmlIntegrity} integrity the `output.html.integrity` option
	 * @returns {string} resolved content
	 */
	static resolveChunkIntegritySentinels(content, compilation, integrity) {
		if (!content.includes("__WEBPACK_HTML_INTEGRITY__")) return content;

		const crypto = require("crypto");

		// Report each bad hash algorithm once, not once per referencing tag.
		const reportedBadAlgorithms = new Set();

		const chunksById = getChunksById(compilation);
		return content.replace(
			INTEGRITY_SENTINEL_REGEXP,
			(_, hexId, contentHashType) => {
				const chunkId = Buffer.from(hexId, "hex").toString("utf8");
				const chunk = chunksById.get(chunkId);
				if (!chunk) return "";
				// `chunk.files` holds the real emitted names (after
				// `RealContentHashPlugin`), so hash those bytes — not a name
				// re-derived from the template, which still has the pre-hash value.
				let filename;
				for (const file of chunk.files) {
					if ((contentHashType === "css") === file.endsWith(".css")) {
						filename = file;
						break;
					}
				}
				if (!filename) return "";
				const asset = compilation.getAsset(filename);
				if (!asset) return "";
				const algorithms =
					typeof integrity === "function"
						? integrity({ chunk, filename })
						: integrity === true
							? ["sha384"]
							: integrity;
				if (!algorithms || algorithms.length === 0) return "";
				const buffer = asset.source.buffer();
				const parts = [];
				for (const algorithm of algorithms) {
					// `crypto.createHash` throws on an unknown algorithm name — turn
					// that into a webpack error and skip the algorithm instead of
					// crashing the whole compilation out of `processAssets`.
					try {
						parts.push(
							`${algorithm}-${crypto
								.createHash(algorithm)
								.update(buffer)
								.digest("base64")}`
						);
					} catch (_err) {
						if (!reportedBadAlgorithms.has(algorithm)) {
							reportedBadAlgorithms.add(algorithm);
							compilation.errors.push(
								new WebpackError(
									`output.html.integrity: unsupported hash algorithm ${JSON.stringify(
										algorithm
									)}`
								)
							);
						}
					}
				}
				if (parts.length === 0) return "";
				return ` integrity="${parts.join(" ")}"`;
			}
		);
	}

	/**
	 * @param {Chunk} chunk chunk
	 * @param {"javascript" | "css"} contentHashType which chunk asset to inline
	 * @returns {string} sentinel
	 */
	static makeChunkInlineSentinel(chunk, contentHashType) {
		const hexId = Buffer.from(String(chunk.id), "utf8").toString("hex");
		return `__WEBPACK_HTML_INLINE__${hexId}__${contentHashType}__END__`;
	}

	/**
	 * Replace every inline sentinel with the chunk's actual source content.
	 * Must run after `RealContentHashPlugin` so the final emitted filenames are
	 * known (we look up the asset by filename from `chunk.files`).
	 * @param {string} content content
	 * @param {Compilation} compilation compilation
	 * @param {string} htmlFilename output name of the HTML file being resolved (to rebase CSS urls)
	 * @param {Set<string>=} inlinedFiles collects every chunk file inlined here, so the caller can drop now-unreferenced assets
	 * @returns {string} resolved content
	 */
	static resolveChunkInlineSentinels(
		content,
		compilation,
		htmlFilename,
		inlinedFiles
	) {
		if (!content.includes("__WEBPACK_HTML_INLINE__")) return content;
		const chunksById = getChunksById(compilation);
		const outputPath = /** @type {string} */ (compilation.outputOptions.path);
		return content.replace(
			INLINE_SENTINEL_REGEXP,
			(_, hexId, contentHashType) => {
				const chunkId = Buffer.from(hexId, "hex").toString("utf8");
				const chunk = chunksById.get(chunkId);
				if (!chunk) return "";
				const isCss = contentHashType === "css";
				let out = "";
				for (const file of chunk.files) {
					if (isCss !== file.endsWith(".css")) continue;
					const asset = compilation.getAsset(file);
					if (!asset) continue;
					let raw = String(asset.source.source());
					if (isCss) {
						// Styles move into the document, so relative `url(...)` must be
						// rebased; then escape `</style` so it can't close the block early.
						raw = rebaseCssUrls(raw, file, htmlFilename, outputPath).replace(
							/<\/(style)/gi,
							"<\\/$1"
						);
					} else {
						// Escape `</script` (early close) and `<!--` (enters the script-data
						// escaped state, where a later `<script` hides the real close); both
						// only occur inside a string/comment/regex, where `<\` is inert.
						raw = raw
							.replace(/<\/(script)/gi, "<\\/$1")
							.replace(/<!--/g, "<\\!--");
					}
					out += raw;
					if (inlinedFiles) inlinedFiles.add(file);
				}
				return out;
			}
		);
	}

	/**
	 * Parses the final HTML once and collects everything the `output.html`
	 * post-processing stages need: every `<script>`/`<link>`/`<style>`/`<meta>` as
	 * a mutable descriptor (for `transformTags`) paired with its source span, an
	 * attribute snapshot (to detect changes), and — for `<script>`/`<style>` — the
	 * raw-text body range and nonce insertion point (for CSP); plus the
	 * `<head>`/`<body>` open/content-end anchors (for `injectTags`). One parse feeds
	 * `injectTags` + `transformTags` + CSP, which `renderHtml` then applies in a
	 * single pass. Uses the pipeline's own parser (no regex).
	 * @param {string} content the final HTML (inline content already resolved)
	 * @returns {HtmlModel} the collected model
	 */
	static collectHtml(content) {
		/** @type {HtmlMutableTag[]} */
		const tags = [];
		/** @type {(HtmlTagSpan | null)[]} */
		const spans = [];
		/** @type {(string | null)[]} */
		const originals = [];
		/** @type {(HtmlTagDescriptor | null)[]} */
		const descriptors = [];
		let headOpen = -1;
		let headEnd = -1;
		let bodyOpen = -1;
		let bodyEnd = -1;
		let headDepth = 0;
		let bodyDepth = 0;
		// `skip.text` populates `contentEnd` (raw-text body end) without
		// materializing text nodes; `</script` stays escaped, so CSP hashes match
		// the exact bytes the browser sees.
		new SourceProcessor()
			.use({
				[NodeType.Element]: {
					enter: (path) => {
						const name = path.tagName();
						if (name === "head") {
							if (headOpen < 0) headOpen = headEnd = path.tagEnd();
							headDepth++;
							return;
						}
						if (name === "body") {
							if (bodyOpen < 0) bodyOpen = bodyEnd = path.tagEnd();
							bodyDepth++;
							return;
						}
						const end = path.end();
						if (headDepth > 0 && end > headEnd) headEnd = end;
						if (bodyDepth > 0 && end > bodyEnd) bodyEnd = end;
						if (
							name !== "script" &&
							name !== "link" &&
							name !== "style" &&
							name !== "meta"
						) {
							return;
						}
						/** @type {Record<string, string | boolean | undefined>} */
						const attrs = {};
						const count = path.attributeCount();
						for (let i = 0; i < count; i++) {
							const attr = path.attributeAt(i);
							attrs[path.attributeName(attr)] =
								path.attributeValueStart(attr) === -1
									? true
									: path.attributeValue(attr);
						}
						const isRawText = name === "script" || name === "style";
						tags.push({
							tag: name,
							attrs,
							injectTo: bodyDepth > 0 ? "body" : "head"
						});
						spans.push({
							start: path.start(),
							openEnd: path.tagEnd(),
							end,
							location: bodyDepth > 0 ? "body" : "head",
							nameEnd: isRawText ? path.nameEnd() : -1,
							contentEnd: isRawText ? path.contentEnd() : -1,
							selfClosing: path.selfClosing()
						});
						originals.push(snapshotAttrs(attrs));
						descriptors.push(null);
					},
					exit: (path) => {
						const name = path.tagName();
						if (name === "head") {
							if (headDepth > 0) headDepth--;
						} else if (name === "body" && bodyDepth > 0) {
							bodyDepth--;
						}
					}
				}
			})
			.process(content, { skip: { text: true, doctype: true } });
		return {
			tags,
			spans,
			originals,
			descriptors,
			anchors: { headOpen, headEnd, bodyOpen, bodyEnd }
		};
	}

	/**
	 * Appends `injectTags` descriptors to the model as spanless tags (pure inserts
	 * placed by `injectTo`), so `transformTags` sees them alongside the page's own
	 * tags and CSP hashes any injected inline `<script>`/`<style>`. `attrs` is
	 * copied so a `transformTags` mutation never corrupts the caller's descriptor.
	 * @param {HtmlModel} model the value from `collectHtml`
	 * @param {HtmlTagDescriptor[]} injected the `injectTags` descriptors
	 * @returns {void}
	 */
	static addInjectedTags(model, injected) {
		for (const descriptor of injected) {
			model.tags.push({
				tag: descriptor.tag,
				attrs: descriptor.attrs ? { ...descriptor.attrs } : {},
				injectTo: descriptor.injectTo || "head"
			});
			model.spans.push(null);
			model.originals.push(null);
			model.descriptors.push(descriptor);
		}
	}

	/**
	 * Renders the collected (and hook-mutated) model back into HTML in a single
	 * pass: injected tags are placed by `injectTo`; an existing tag is left
	 * byte-for-byte unless it was removed, moved (`<head>`↔`<body>`, honoring
	 * `*-prepend`), or had its `attrs` changed; and — when `csp` is set and the
	 * page declares no CSP — a strict `<meta http-equiv="Content-Security-Policy">`
	 * is injected with a hash of every inline `<script>`/`<style>` (page's own and
	 * injected) plus an optional placeholder `nonce` on each. Edits run
	 * right-to-left; at a shared offset a delete/replace runs before an insert.
	 * @param {string} content the collected HTML (inline content already resolved)
	 * @param {HtmlModel} model the value from `collectHtml` after the hooks
	 * @param {CspOption} csp the `output.html.csp` option
	 * @returns {string} the rendered HTML
	 */
	static renderHtml(content, model, csp) {
		const { tags, spans, originals, descriptors, anchors } = model;
		// CSP setup: an author-declared policy (page's own or injected) wins.
		const options = csp ? (csp === true ? {} : csp) : undefined;
		const nonce = options && options.nonce;
		let hasCsp = false;
		if (options) {
			for (let i = 0; i < tags.length; i++) {
				const tag = tags[i];
				if (!tag.remove && tag.tag === "meta" && metaIsCsp(tag.attrs)) {
					hasCsp = true;
					break;
				}
			}
		}
		const addCsp = Boolean(options) && !hasCsp;
		/** @type {Set<string>} */
		const scriptSrc = new Set();
		/** @type {Set<string>} */
		const styleSrc = new Set();
		let hashOf;
		if (addCsp) {
			const hashFunction =
				/** @type {Exclude<CspOption, boolean | undefined>} */ (options)
					.hashFunction || "sha256";
			const createHash = getCreateNodeHash();
			hashOf = (/** @type {string} */ body) =>
				`'${hashFunction}-${createHash(hashFunction)
					.update(body, "utf8")
					.digest("base64")}'`;
		}
		// Insertions accumulated per offset (placement order preserved); range edits
		// replace/delete an existing tag's span; region groups collect placements so
		// `*-prepend` precedes the plain name at a shared (empty-region) anchor.
		/** @type {Map<number, string>} */
		const inserts = new Map();
		/** @type {(pos: number, text: string) => void} */
		const at = (pos, text) => {
			if (text) inserts.set(pos, (inserts.get(pos) || "") + text);
		};
		// Placements accumulate per region so `*-prepend` always precedes the plain
		// name at a shared offset (an empty `<head>`/`<body>`); emitted at the anchors
		// after the loop.
		/** @type {Record<string, string>} */
		const groups = {
			"head-prepend": "",
			head: "",
			"body-prepend": "",
			body: ""
		};
		/** @type {(region: string | undefined, text: string) => void} */
		const place = (region, text) => {
			if (text) {
				groups[region !== undefined && region in groups ? region : "head"] +=
					text;
			}
		};
		/** @type {{ start: number, end: number, text: string, insert: boolean }[]} */
		const edits = [];
		for (let i = 0; i < tags.length; i++) {
			const tag = tags[i];
			const span = spans[i];
			const isRawText = tag.tag === "script" || tag.tag === "style";
			const needsNonce =
				addCsp &&
				Boolean(nonce) &&
				isRawText &&
				!attrPresent(tag.attrs, "nonce");
			// Hash an inline `<script>`/`<style>` (page's own or injected). External
			// `<script src>` is covered by `'self'`; a self-closing tag has no body.
			if (addCsp && isRawText && !tag.remove) {
				const isScript = tag.tag === "script";
				let body = "";
				if (span) {
					if (
						!span.selfClosing &&
						!(isScript && attrPresent(tag.attrs, "src"))
					) {
						body = content.slice(span.openEnd, span.contentEnd);
					}
				} else if (!(isScript && attrPresent(tag.attrs, "src"))) {
					body =
						/** @type {HtmlTagDescriptor} */ (descriptors[i]).children || "";
				}
				if (body !== "") {
					(isScript ? scriptSrc : styleSrc).add(
						/** @type {(body: string) => string} */ (hashOf)(body)
					);
				}
			}
			if (!span) {
				// Injected tag: serialize (with a nonce when CSP asks) and place it.
				if (tag.remove) continue;
				const descriptor = /** @type {HtmlTagDescriptor} */ (descriptors[i]);
				const attrs = needsNonce
					? { nonce: /** @type {string} */ (nonce), ...tag.attrs }
					: tag.attrs;
				place(
					tag.injectTo || "head",
					serializeTag({
						tag: tag.tag,
						attrs,
						children: descriptor.children,
						voidTag: descriptor.voidTag
					})
				);
				continue;
			}
			// Existing tag.
			if (tag.remove) {
				edits.push({
					start: span.start,
					end: span.end,
					text: "",
					insert: false
				});
				continue;
			}
			const attrsChanged = snapshotAttrs(tag.attrs) !== originals[i];
			const moved =
				tag.injectTo !== undefined && tag.injectTo !== span.location;
			const nonceStr = needsNonce
				? ` nonce="${escapeAttribute(/** @type {string} */ (nonce))}"`
				: "";
			if (moved) {
				const opening = `<${tag.tag}${nonceStr}${serializeAttrs(tag.attrs)}>`;
				edits.push({
					start: span.start,
					end: span.end,
					text: "",
					insert: false
				});
				place(tag.injectTo, opening + content.slice(span.openEnd, span.end));
			} else if (attrsChanged) {
				// Rewrite the opening tag (a nonce, if any, lands first).
				edits.push({
					start: span.start,
					end: span.openEnd,
					text: `<${tag.tag}${nonceStr}${serializeAttrs(tag.attrs)}>`,
					insert: false
				});
			} else if (nonceStr) {
				// Nonce-only change: insert right after the tag name, rest verbatim.
				edits.push({
					start: span.nameEnd,
					end: span.nameEnd,
					text: nonceStr,
					insert: true
				});
			}
		}
		if (addCsp) {
			if (nonce) {
				scriptSrc.add(`'nonce-${nonce}'`);
				styleSrc.add(`'nonce-${nonce}'`);
			}
			// Strict baseline; a user `policy` directive replaces one, hashes/nonce append.
			/** @type {Map<string, Set<string>>} */
			const directives = new Map([
				["script-src", new Set(["'self'"])],
				["style-src", new Set(["'self'"])],
				["object-src", new Set(["'none'"])],
				["base-uri", new Set(["'self'"])]
			]);
			const policyOption =
				/** @type {Exclude<CspOption, boolean | undefined>} */ (options).policy;
			if (policyOption) {
				for (const [name, value] of Object.entries(policyOption)) {
					directives.set(name, new Set(Array.isArray(value) ? value : [value]));
				}
			}
			/** @type {(name: string, extra: Set<string>) => void} */
			const append = (name, extra) => {
				let set = directives.get(name);
				if (!set) directives.set(name, (set = new Set()));
				for (const value of extra) set.add(value);
			};
			append("script-src", scriptSrc);
			append("style-src", styleSrc);
			const policy = [...directives]
				.filter(([, values]) => values.size > 0)
				.map(([name, values]) => `${name} ${[...values].join(" ")}`)
				.join("; ");
			const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(
				policy
			)}">`;
			// First at the head anchor, so it precedes any head-prepend tag.
			at(anchors.headOpen, meta);
		}
		// Emit region placements at the `<head>`/`<body>` anchors (after any CSP
		// meta, prepend before the plain name). The parser always synthesizes an
		// implied `<head>`/`<body>`, so both anchors are always present.
		at(anchors.headOpen, groups["head-prepend"]);
		at(anchors.headEnd, groups.head);
		at(anchors.bodyOpen, groups["body-prepend"]);
		at(anchors.bodyEnd, groups.body);
		for (const [pos, text] of inserts) {
			edits.push({ start: pos, end: pos, text, insert: true });
		}
		if (edits.length === 0) return content;
		edits.sort(
			(a, b) => b.start - a.start || Number(a.insert) - Number(b.insert)
		);
		let result = content;
		for (const edit of edits) {
			result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
		}
		return result;
	}

	/**
	 * Embeds each inlined chunk's content hash into its inline sentinel
	 * (`…__<type>__END__` → `…__<type>__<hash>__END__`). The sentinel otherwise
	 * carries only the stable chunk id, so the host HTML's bytes wouldn't change
	 * when the inlined content changes — the resolved chunk URL that normally
	 * busts the page `[contenthash]` is gone once inlined. Embedding the hash
	 * makes the emitted bytes content-dependent, so both the initial hash and
	 * RealContentHashPlugin's recompute pick up inlined-content changes. The
	 * resolver (`resolveChunkInlineSentinels`) ignores this segment.
	 * @param {string} content content with chunk-url sentinels already resolved
	 * @param {Compilation} compilation compilation
	 * @returns {string} content with content-hash-tagged inline sentinels
	 */
	static embedInlineChunkHashes(content, compilation) {
		if (!content.includes("__WEBPACK_HTML_INLINE__")) return content;
		const chunksById = getChunksById(compilation);
		return content.replace(
			INLINE_SENTINEL_REGEXP,
			(match, hexId, contentHashType) => {
				const chunkId = Buffer.from(hexId, "hex").toString("utf8");
				const chunk = chunksById.get(chunkId);
				if (!chunk) return match;
				const hash =
					(chunk.contentHash && chunk.contentHash[contentHashType]) ||
					chunk.renderedHash ||
					chunk.hash;
				if (!hash) return match;
				return `__WEBPACK_HTML_INLINE__${hexId}__${contentHashType}__${hash}__END__`;
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
	 * `originModule` (the EntryDependency added by `compilation.addEntry`) —
	 * this covers both HTML-as-entry-point and a linked `type: "html"` page
	 * (added as its own entry by HtmlModulesPlugin).
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
	 * modules used as compilation entries — that's the HTML-as-entry-point case
	 * and a linked `type: "html"` page (which is added as its own entry).
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
	 * @param {Dependency} dependency the dependency to generate
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the template context (shared across all dependencies of the module)
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
	 * Processes the provided dependencies block.
	 * @param {import("../DependenciesBlock")} block the dependencies block which will be processed
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the template context
	 * @returns {void}
	 */
	sourceBlock(block, source, templateContext) {
		for (const dependency of block.dependencies) {
			this.sourceDependency(dependency, source, templateContext);
		}

		for (const childBlock of block.blocks) {
			this.sourceBlock(childBlock, source, templateContext);
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
		// Only `dependency` varies across `template.apply` calls, so one context
		// (and one lazy `chunkInitFragments` getter) serves the whole module.
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

		for (const dependency of module.dependencies) {
			this.sourceDependency(dependency, source, templateContext);
		}

		if (module.presentationalDependencies !== undefined) {
			for (const dependency of module.presentationalDependencies) {
				this.sourceDependency(dependency, source, templateContext);
			}
		}

		for (const childBlock of module.blocks) {
			this.sourceBlock(childBlock, source, templateContext);
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
		if (!rawContent.includes(PUBLIC_PATH_AUTO)) return rawContent;
		// A relative `<base href>` prepends `../`s so the base can't misdirect
		// the rewritten URLs (see `HtmlParser`).
		const basePrefix =
			/** @type {HtmlModuleBuildInfo} */ (module.buildInfo).baseUrlPrefix || "";
		return rawContent.split(PUBLIC_PATH_AUTO).join(basePrefix + undoPath);
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
		// One `_shouldExtract` walk covers both checks (expose = extract ∪ inline).
		const extract = this._shouldExtract(updateHashContext.module);
		if (extract || this.options.extract === "inline") {
			hash.update("html-type");
		}
		if (extract) {
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
