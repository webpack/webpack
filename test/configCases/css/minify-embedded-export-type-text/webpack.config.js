"use strict";

const SampleEmbeddedMinifyPlugin = require("../../../helpers/SampleEmbeddedMinifyPlugin");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	experiments: { css: true },
	// webpack ships the hook but taps nothing; this stands in for the minimizer.
	plugins: [new SampleEmbeddedMinifyPlugin()],
	module: {
		rules: [
			{ test: /\.css$/, type: "css/auto", parser: { exportType: "text" } }
		]
	}
};
