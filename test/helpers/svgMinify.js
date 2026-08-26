"use strict";

/**
 * A `minify` function for `minimizer-webpack-plugin` standing in for an SVG
 * minifier: webpack ships none, so this is the only way an `<svg>` subtree or an
 * `image/svg+xml` payload is reached at all. Collapsing runs of whitespace is
 * enough to show the source got here and back.
 * @param {{ [file: string]: string }} input a single `{ filename: code }` entry
 * @returns {{ code: string }} the minified SVG
 */
const svgMinify = (input) => {
	const [[, code]] = Object.entries(input);
	return { code: code.replace(/\s+/g, " ").trim() };
};

// The language it minifies — what embedded source, which carries no filename, is
// dispatched by.
svgMinify.getTypes = () => ["svg"];
svgMinify.supportsWorker = () => false;
svgMinify.supportsWorkerThreads = () => false;

/**
 * @param {string} name asset filename
 * @returns {boolean} true for SVG assets
 */
svgMinify.filter = (name) => /\.svg(\?.*)?$/i.test(name);

module.exports = svgMinify;
