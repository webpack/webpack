"use strict";

const SampleEmbeddedMinifyPlugin = require("../../../helpers/SampleEmbeddedMinifyPlugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: "source-map",
	// Without this the path comment webpack prefixes makes the two stylesheets
	// differ, and a cache keyed by text alone would never be asked to share.
	output: { pathinfo: false },
	experiments: { css: true },
	module: {
		rules: [
			{ test: /\.css$/, type: "css/auto", parser: { exportType: "text" } }
		]
	},
	plugins: [new SampleEmbeddedMinifyPlugin({ css: true, html: false })]
};
