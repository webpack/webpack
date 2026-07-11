/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan @aryanraj45
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Compilation = require("../Compilation");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */

// Per-compilation collector (stable specifier -> resolved chunk URL). It is
// populated while `ModuleChunkFormatPlugin` renders ESM inter-chunk imports and
// emitted as an import map, so those imports reference a content-independent
// specifier instead of a hashed filename — breaking ESM cascading cache
// invalidation (a leaf chunk's hash change no longer re-hashes its importers).
// Experimental; static initial-graph imports only (async `import()` is a TODO).
/** @type {WeakMap<Compilation, Map<string, string>>} */
const importMaps = new WeakMap();

const PLUGIN_NAME = "ChunkImportMapPlugin";

// A `<script type="importmap"> … </script>` block (single or double quoted).
const IMPORTMAP_RE =
	/<script\s+type=(["'])importmap\1\s*>([\s\S]*?)<\/script>/i;
// Opening `<head>` tag (optional attributes).
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
	 * The collector for a compilation when the feature is active, else undefined.
	 * @param {Compilation} compilation the compilation
	 * @returns {Map<string, string> | undefined} the collector
	 */
	static getImportMap(compilation) {
		return importMaps.get(compilation);
	}

	/**
	 * Injects/merges an import map into an HTML document: merges into an existing
	 * `<script type="importmap">` when present (user entries kept), otherwise
	 * inserts a new one right after `<head>` (before the first module script), or
	 * prepends it when there is no `<head>`.
	 * @param {string} html the HTML document
	 * @param {Record<string, string>} imports specifier -> URL entries to add
	 * @returns {string} the HTML document with the import map
	 */
	static injectIntoHtml(html, imports) {
		const existing = IMPORTMAP_RE.exec(html);
		if (existing) {
			/** @type {EXPECTED_ANY} */
			let map;
			try {
				map = JSON.parse(existing[2]);
			} catch (_err) {
				map = undefined;
			}
			if (!map || typeof map !== "object") map = {};
			// User entries win; webpack's disjoint `webpack/c/*` keys are added.
			map.imports = { ...map.imports, ...imports };
			const merged = `<script type="importmap">${JSON.stringify(map)}</script>`;
			// Function replacer: the JSON may contain `$` sequences.
			return html.replace(IMPORTMAP_RE, () => merged);
		}
		const tag = `<script type="importmap">${JSON.stringify({
			imports
		})}</script>`;
		const head = HEAD_OPEN_RE.exec(html);
		if (head) {
			const at = head.index + head[0].length;
			return `${html.slice(0, at)}\n${tag}${html.slice(at)}`;
		}
		return `${tag}\n${html}`;
	}

	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			/** @type {Map<string, string>} */
			const collector = new Map();
			importMaps.set(compilation, collector);
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					// After chunk assets and generated HTML exist.
					stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
				},
				() => {
					if (collector.size === 0) return;
					/** @type {Record<string, string>} */
					const imports = {};
					// Sorted for deterministic output across builds.
					for (const key of [...collector.keys()].sort()) {
						imports[key] = /** @type {string} */ (collector.get(key));
					}
					// DX: when webpack owns the document (`experiments.html`), inject the
					// map into each generated page; otherwise emit a standalone
					// `importmap.json` for the app/backend to inject itself (Vite-style).
					let injected = false;
					if (compilation.options.experiments.html) {
						for (const { name, source } of compilation.getAssets()) {
							if (!/\.html$/i.test(name)) continue;
							const html = source.source().toString();
							if (!HEAD_OPEN_RE.test(html) && !IMPORTMAP_RE.test(html)) continue;
							compilation.updateAsset(
								name,
								new RawSource(
									ChunkImportMapPlugin.injectIntoHtml(html, imports)
								)
							);
							injected = true;
						}
					}
					if (!injected) {
						compilation.emitAsset(
							"importmap.json",
							new RawSource(JSON.stringify({ imports }, null, 2))
						);
					}
				}
			);
		});
	}
}

module.exports = ChunkImportMapPlugin;
