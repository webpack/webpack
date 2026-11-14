"use strict";

/**
 * A `minify` function for `minimizer-webpack-plugin` that prints an SVG with
 * webpack's XML printer and hands each `<style>` to the plugin's renderer.
 * @param {{ [file: string]: string | Buffer }} input a single `{ filename: code }` entry
 * @param {unknown} sourceMap the input source map, unused
 * @param {{ renderEmbeddedSource?: import("../../../../lib/css/cssMinify").AsyncEmbeddedSourceRenderer }} options the plugin's options for this minimizer
 * @returns {Promise<{ code: string }>} the minified SVG
 */
const xmlStyleMinify = async (input, sourceMap, options) => {
	const webpack = require("../../../../");

	const { askEmbeddedRenderer, embeddedText } = webpack.util.dataURL;
	const [[, given]] = Object.entries(input);
	const code = typeof given === "string" ? given : given.toString("utf8");
	const render = options.renderEmbeddedSource;
	const result = await new webpack.html.syntax.SourceProcessor().processAsync(
		code,
		{
			xml: true,
			mode: "minify",
			renderEmbeddedSource:
				render === undefined
					? undefined
					: async (source, hole) =>
							embeddedText(await askEmbeddedRenderer(render, hole, []))
		}
	);
	return { code: result.code };
};

xmlStyleMinify.getTypes = () => ["svg"];
xmlStyleMinify.getEmbeddedTypes = () => ["css"];
xmlStyleMinify.supportsWorker = () => false;
xmlStyleMinify.supportsWorkerThreads = () => false;

/**
 * @param {string} name asset filename
 * @returns {boolean} true for SVG assets
 */
xmlStyleMinify.filter = (name) => /\.svg(\?.*)?$/i.test(name);

module.exports = xmlStyleMinify;
