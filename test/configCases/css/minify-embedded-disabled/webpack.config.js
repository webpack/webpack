"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: { css: true },
	// No tap: webpack itself never minifies embedded CSS, so the text is verbatim.
	module: {
		rules: [
			{ test: /\.css$/, type: "css/auto", parser: { exportType: "text" } }
		]
	}
};
