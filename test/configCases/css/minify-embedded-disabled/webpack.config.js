"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: { css: true },
	// `css: false` must reach embedded CSS too, not only `.css` assets.
	optimization: { minimize: { javascript: false, css: false } },
	module: {
		rules: [
			{ test: /\.css$/, type: "css/auto", parser: { exportType: "text" } }
		]
	}
};
