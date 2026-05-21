/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const CssUrlDependency = require("../dependencies/CssUrlDependency");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */

// Deferred-substitution sentinel for chunk URLs that need to land inside an
// HTML module's rendered output. Webpack runs dependency templates during
// `Compilation#codeGeneration()` — that's before `createHash()` populates
// `chunk.hash` and `chunk.contentHash[type]`, so any `[contenthash]` /
// `[chunkhash]` / `[fullhash]` in a chunk's filename template can't resolve
// at code-gen time. Instead, dep templates that want to embed a chunk URL
// in the HTML emit a sentinel via `makeHtmlChunkUrlSentinel`, and
// `HtmlModulesPlugin#renderManifest` (which runs after chunk hashes are
// known) swaps every sentinel for `${PUBLIC_PATH_AUTO}<chunkFilename>`
// via `resolveHtmlChunkUrlSentinels` *before* hashing the HTML — so the
// HTML's own `[contenthash]` reflects the referenced chunks' hashes.

const SENTINEL_PREFIX = "__WEBPACK_HTML_CHUNK_URL__";
const SENTINEL_SUFFIX = "__END__";
// Sentinel form: `__WEBPACK_HTML_CHUNK_URL__<hexChunkId>__<contentHashType>__END__`.
// `<hexChunkId>` is `chunk.id` UTF-8-encoded and hex-encoded so arbitrary
// id characters (including the `_` we use as a delimiter) can't conflict
// with the surrounding `__` separators. `<contentHashType>` is `javascript`
// or `css` — lowercase ASCII letters only, no encoding needed.
const SENTINEL_RE = /__WEBPACK_HTML_CHUNK_URL__([0-9a-f]+)__([a-z]+)__END__/g;

/**
 * @param {string | number} id chunk id
 * @returns {string} hex-encoded id
 */
const encodeChunkId = (id) => Buffer.from(String(id), "utf8").toString("hex");

/**
 * @param {string} hex hex-encoded id
 * @returns {string} decoded id
 */
const decodeChunkId = (hex) => Buffer.from(hex, "hex").toString("utf8");

/**
 * Build a sentinel string that stands in for the chunk's emitted URL during
 * HTML code generation. The sentinel is resolved by
 * `resolveHtmlChunkUrlSentinels` once chunk hashes are known.
 * @param {Chunk} chunk chunk whose URL should be embedded in the HTML
 * @param {"javascript" | "css"} contentHashType which `chunk.contentHash[type]` slice of the chunk the resolved URL should reference (`.js` vs `.css`)
 * @returns {string} sentinel string (or `data:,` if the chunk has no id yet, which should not happen in a well-formed compilation)
 */
const makeHtmlChunkUrlSentinel = (chunk, contentHashType) => {
	const id = chunk.id;
	if (id === null || id === undefined) return "data:,";
	return `${SENTINEL_PREFIX}${encodeChunkId(id)}__${contentHashType}${SENTINEL_SUFFIX}`;
};

/**
 * Replace every sentinel produced by `makeHtmlChunkUrlSentinel` in `content`
 * with `${CssUrlDependency.PUBLIC_PATH_AUTO}<chunkFilename>`. Must be called
 * inside the `renderManifest` hook (i.e. after `createHash()` has populated
 * every chunk's `chunk.hash` / `chunk.contentHash[type]` and the compilation
 * hash) so the chunk filename's `[contenthash]` / `[chunkhash]` /
 * `[fullhash]` placeholders all resolve. The `PUBLIC_PATH_AUTO` prefix is
 * left in place so the downstream `undoPath` substitution in
 * `HtmlModulesPlugin#renderManifest` still applies.
 * @param {string} content HTML content possibly containing sentinels
 * @param {Compilation} compilation compilation
 * @returns {string} content with every sentinel replaced
 */
const resolveHtmlChunkUrlSentinels = (content, compilation) => {
	if (!content.includes(SENTINEL_PREFIX)) return content;
	const outputOptions = compilation.outputOptions;
	/** @type {Map<string, Chunk>} */
	const chunksById = new Map();
	for (const chunk of compilation.chunks) {
		if (chunk.id !== null && chunk.id !== undefined) {
			chunksById.set(String(chunk.id), chunk);
		}
	}
	return content.replace(SENTINEL_RE, (match, hexId, contentHashType) => {
		const chunkId = decodeChunkId(hexId);
		const chunk = chunksById.get(chunkId);
		if (!chunk) return "data:,";
		let filenameTemplate;
		if (contentHashType === "css") {
			// CSS chunks use the CSS-specific filename template — same lookup
			// `HtmlScriptSrcDependency` uses to emit `<link rel="stylesheet">`.
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
		try {
			const filename = compilation.getPath(
				/** @type {import("../TemplatedPathPlugin").TemplatePath} */
				(filenameTemplate),
				{
					chunk,
					contentHashType
				}
			);
			return `${CssUrlDependency.PUBLIC_PATH_AUTO}${filename}`;
		} catch (_) {
			// `compilation.getPath` throws when the filename template contains
			// a placeholder that isn't available in the current context — most
			// commonly `[contenthash]` / `[chunkhash]` / `[fullhash]` called
			// from `HtmlGenerator#generate`'s JS-export path, where chunk
			// hashes aren't computed yet. Leave the sentinel in place so the
			// later `HtmlModulesPlugin#renderManifest` pass (run after
			// `createHash()`) can still resolve it for the extracted HTML
			// output. The JS export path will keep the sentinel string — JS
			// callers of `require("./page.html")` who need dynamic chunk
			// URLs should rely on `extract: true` instead.
			return match;
		}
	});
};

module.exports = {
	makeHtmlChunkUrlSentinel,
	resolveHtmlChunkUrlSentinels
};
