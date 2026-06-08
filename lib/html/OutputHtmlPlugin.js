/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const { HTML_MODULE_TYPE } = require("../ModuleTypeConstants");
const { getUndoPath } = require("../util/identifier");

/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "OutputHtmlPlugin";

/**
 * @param {string} value attribute value
 * @returns {string} escaped value
 */
const escapeAttr = (value) =>
	value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/**
 * @param {string} text text content
 * @returns {string} escaped text
 */
const escapeText = (text) =>
	text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Generates an HTML file for every non-HTML entrypoint and injects that
 * entrypoint's initial CSS (as `<link>` in `<head>`) and JS (as `<script>` at
 * the end of `<body>`) output chunks.
 */
class OutputHtmlPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				() => {
					const { outputOptions, chunkGraph } = compilation;
					const { publicPath } = outputOptions;
					// A function publicPath only resolves at runtime, so static HTML
					// falls back to relative URLs just like `"auto"`.
					const staticPublicPath =
						typeof publicPath === "string" && publicPath !== "auto"
							? publicPath
							: undefined;
					const scriptAttr = outputOptions.module ? 'type="module"' : "defer";

					for (const [name, entrypoint] of compilation.entrypoints) {
						const entryChunk = entrypoint.getEntrypointChunk();

						// HTML entries already emit their own `.html` via HtmlModulesPlugin.
						let isHtmlEntry = false;
						for (const module of chunkGraph.getChunkEntryModulesIterable(
							entryChunk
						)) {
							if (module.type === HTML_MODULE_TYPE) {
								isHtmlEntry = true;
								break;
							}
						}
						if (isHtmlEntry) continue;

						const scripts = [];
						const styles = [];
						for (const chunk of entryChunk.getAllInitialChunks()) {
							for (const file of chunk.files) {
								if (/\.[mc]?js(\?|$)/.test(file)) scripts.push(file);
								else if (/\.css(\?|$)/.test(file)) styles.push(file);
							}
						}
						if (scripts.length === 0 && styles.length === 0) continue;

						const filename = compilation.getPath(
							/** @type {string} */ (outputOptions.htmlFilename),
							{
								chunk: entryChunk,
								contentHashType: "javascript"
							}
						);

						const prefix =
							staticPublicPath !== undefined
								? staticPublicPath
								: getUndoPath(
										filename,
										/** @type {string} */ (outputOptions.path),
										false
									);
						/**
						 * @param {string} file output filename
						 * @returns {string} escaped URL with prefix
						 */
						const url = (file) => escapeAttr(prefix + file);

						const links = styles
							.map((file) => `    <link rel="stylesheet" href="${url(file)}">`)
							.join("\n");
						const tags = scripts
							.map(
								(file) =>
									`    <script ${scriptAttr} src="${url(file)}"></script>`
							)
							.join("\n");

						const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapeText(name)}</title>
${links}
  </head>
  <body>
${tags}
  </body>
</html>
`;

						compilation.emitAsset(filename, new RawSource(html));
					}
				}
			);
		});
	}
}

module.exports = OutputHtmlPlugin;
