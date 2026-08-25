"use strict";

const SampleEmbeddedMinifyPlugin = require("../../../helpers/SampleEmbeddedMinifyPlugin");

// Stands in for an SVG minifier: collapsing runs of whitespace is enough to
// show the payload was reached and put back in the form it was written in.
/** @type {import("../../../../lib/html/syntax").EmbeddedSourceRenderer} */
const renderEmbeddedSource = (source, { type }) =>
	type === "svg" ? source.replace(/\s+/g, " ").trim() : source;

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: { css: true, html: true },
	module: {
		rules: [
			{ test: /\.css$/, type: "css/auto", parser: { exportType: "text" } }
		]
	},
	plugins: [new SampleEmbeddedMinifyPlugin({ renderEmbeddedSource })]
};
