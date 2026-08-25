"use strict";

const SampleEmbeddedMinifyPlugin = require("../../../helpers/SampleEmbeddedMinifyPlugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	// Universal, so the inject runtime collects the styles instead of reaching
	// for a DOM this test has none of.
	target: ["web", "node"],
	experiments: { css: true },
	plugins: [new SampleEmbeddedMinifyPlugin()],
	module: {
		rules: [{ test: /\.css$/, type: "css", parser: { exportType: "style" } }]
	}
};
