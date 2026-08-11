/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan @aryanraj45
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const {
	chunkHasJs,
	getChunkFilenameTemplate
} = require("../javascript/JavascriptModulesPlugin");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

/**
 * @typedef {object} ChunkImportMapPluginOptions
 * @property {string=} fileName name of the emitted import map asset
 */

// Compilations the feature is active for. `ModuleChunkFormatPlugin` asks this
// while rendering ESM inter-chunk imports and emits a content-independent
// specifier instead of a hashed filename, breaking ESM cascading cache
// invalidation (a leaf chunk's hash change no longer re-hashes its importers).
// Experimental; static initial-graph imports only (async `import()` is a TODO).
/** @type {WeakSet<import("../Compilation")>} */
const enabled = new WeakSet();

const PLUGIN_NAME = "ChunkImportMapPlugin";

const DEFAULT_FILENAME = "importmap.json";

// An import map must precede every module script and modulepreload link it
// applies to, so these mirror the tags the injected tag has to be placed before.
const IMPORTMAP_RE =
	/[ \t]*<script[^>]*type\s*=\s*(?:"importmap"|'importmap'|importmap)[^>]*>[\s\S]*?<\/script>/i;
const MODULE_SCRIPT_RE =
	/[ \t]*<script[^>]*type\s*=\s*(?:"module"|'module'|module)[^>]*>/i;
const MODULEPRELOAD_LINK_RE =
	/[ \t]*<link[^>]*rel\s*=\s*(?:"modulepreload"|'modulepreload'|modulepreload)[\s\S]*?>/i;
const APPEND_BEFORE_RE = new RegExp(
	[MODULE_SCRIPT_RE, MODULEPRELOAD_LINK_RE].map((r) => r.source).join("|"),
	"i"
);
const HEAD_OPEN_RE = /<head\b[^>]*>/i;

class ChunkImportMapPlugin {
	/**
	 * The stable, content-independent specifier used as a chunk's import-map key.
	 * @param {Chunk} chunk the chunk
	 * @returns {string} the specifier
	 */
	static getSpecifier(chunk) {
		return `webpack/c/${chunk.id}`;
	}

	/**
	 * Whether inter-chunk imports of this compilation go through the import map.
	 * @param {import("../Compilation")} compilation the compilation
	 * @returns {boolean} true when the feature is active
	 */
	static isEnabled(compilation) {
		return enabled.has(compilation);
	}

	/**
	 * Injects an import map into an HTML document, placed before the first module
	 * script or modulepreload link so it applies to them. An import map already in
	 * the document is merged into the injected one (user entries win) rather than
	 * left in place, since a document may only carry a single import map.
	 * @param {string} html the HTML document
	 * @param {Record<string, string>} imports specifier -> URL entries to add
	 * @returns {string} the HTML document with the import map
	 */
	static injectIntoHtml(html, imports) {
		/** @type {EXPECTED_ANY} */
		let map;
		const existing = IMPORTMAP_RE.exec(html);
		if (existing) {
			const content = existing[0].slice(
				existing[0].indexOf(">") + 1,
				existing[0].lastIndexOf("<")
			);
			try {
				map = JSON.parse(content);
			} catch (_err) {
				map = undefined;
			}
			if (!map || typeof map !== "object") map = {};
			html = html.replace(IMPORTMAP_RE, "");
		} else {
			map = {};
		}
		map.imports = { ...map.imports, ...imports };
		const tag = `<script type="importmap">${JSON.stringify(map)}</script>`;
		const before = APPEND_BEFORE_RE.exec(html);
		if (before) {
			return `${html.slice(0, before.index)}${tag}\n${html.slice(
				before.index
			)}`;
		}
		// No module script to precede — keep the tag inside the document instead of
		// before the doctype, which would put the page into quirks mode.
		const head = HEAD_OPEN_RE.exec(html);
		if (head) {
			const at = head.index + head[0].length;
			return `${html.slice(0, at)}\n${tag}${html.slice(at)}`;
		}
		return `${tag}\n${html}`;
	}

	/**
	 * @param {ChunkImportMapPluginOptions=} options options
	 */
	constructor(options = {}) {
		this.fileName = options.fileName || DEFAULT_FILENAME;
	}

	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { fileName } = this;
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			enabled.add(compilation);
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					// After chunk assets and generated HTML exist.
					stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
				},
				() => {
					const { chunkGraph, outputOptions } = compilation;
					const { publicPath } = outputOptions;
					// Import map addresses must be absolute or start with `./`/`../`;
					// a relative `publicPath` gives no usable prefix.
					const prefix =
						typeof publicPath === "string" &&
						publicPath !== "auto" &&
						publicPath !== ""
							? publicPath
							: "./";
					/** @type {Record<string, string>} */
					const imports = {};
					// Derived from the chunk graph rather than recorded while rendering,
					// so an incremental rebuild that reuses cached chunk assets still
					// produces the complete map.
					/** @type {[string, string][]} */
					const specifiers = [];
					for (const chunk of compilation.chunks) {
						if (!chunkHasJs(chunk, chunkGraph)) continue;
						specifiers.push([
							ChunkImportMapPlugin.getSpecifier(chunk),
							prefix +
								compilation
									.getPath(getChunkFilenameTemplate(chunk, outputOptions), {
										chunk,
										contentHashType: "javascript"
									})
									.replace(/^\/+/g, "")
						]);
					}
					if (specifiers.length === 0) return;
					// Sorted for deterministic output across builds.
					specifiers.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
					for (const [specifier, url] of specifiers) imports[specifier] = url;
					// Always emitted so a backend or a manifest consumer can inject the
					// map itself; additionally injected when webpack owns the document.
					compilation.emitAsset(
						fileName,
						new RawSource(JSON.stringify({ imports }, null, 2))
					);
					if (!compilation.options.experiments.html) return;
					for (const { name, source } of compilation.getAssets()) {
						if (!name.endsWith(".html")) continue;
						compilation.updateAsset(
							name,
							new RawSource(
								ChunkImportMapPlugin.injectIntoHtml(
									source.source().toString(),
									imports
								)
							)
						);
					}
				}
			);
		});
	}
}

module.exports = ChunkImportMapPlugin;
