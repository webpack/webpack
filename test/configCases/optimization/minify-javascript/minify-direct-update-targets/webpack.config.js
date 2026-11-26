"use strict";

module.exports = {
	mode: "production",
	target: "node",
	entry: "./index.mjs",
	optimization: { minimize: true, minimizer: ["..."] },
	output: {
		filename: "bundle.mjs",
		library: { type: "module" }
	}
};
